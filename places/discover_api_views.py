from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Exists, OuterRef
from django.utils import timezone
from datetime import datetime
from .models import Place, PlacePreference, UserBehavior
from .serializers import PlaceSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def discover_places(request):
    """
    Keşfet sayfası için mekan kartlarını getirir
    Kullanıcının daha önce swipe yaptığı mekanları filtreler
    """
    user = request.user
    
    # Filtreler
    category = request.query_params.get('category', None)
    price_level = request.query_params.get('price_level', None)
    atmosphere = request.query_params.get('atmosphere', None)
    suitable_for = request.query_params.get('suitable_for', None)
    city = request.query_params.get('city', None)
    
    # Kullanıcının daha önce swipe yaptığı mekanları al
    swiped_place_ids = PlacePreference.objects.filter(
        user=user
    ).values_list('place_id', flat=True)
    
    # Swipe yapılmamış mekanları getir
    places = Place.objects.exclude(id__in=swiped_place_ids)
    
    # SQLite uyumlu filtreler
    if price_level:
        places = places.filter(price_level=price_level)
    
    if city:
        places = places.filter(city__icontains=city)
    
    # Fotoğrafı olan mekanları önceliklendir
    places = places.order_by('-created_at')
    
    # Queryset'i listeye çevir
    places_list = list(places)
    
    # JSONField filtrelerini Python'da yap (SQLite uyumluluğu için)
    if category:
        places_list = [p for p in places_list if category in (p.categories or [])]
    
    if atmosphere:
        places_list = [p for p in places_list if atmosphere in (p.tags or [])]
    
    if suitable_for:
        places_list = [p for p in places_list if suitable_for in (p.categories or [])]
    
    # Serialize et
    serializer = PlaceSerializer(places_list[:20], many=True)  # İlk 20 mekan
    
    return Response({
        'success': True,
        'places': serializer.data,
        'count': len(serializer.data),
        'total_available': len(places_list)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def swipe_place(request):
    """
    Kullanıcının swipe işlemini kaydeder
    body: {
        place_id: int,
        action: "like" | "dislike" | "save"
    }
    """
    user = request.user
    place_id = request.data.get('place_id')
    action = request.data.get('action')
    
    # Validasyon
    if not place_id:
        return Response(
            {'success': False, 'error': 'place_id gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if action not in ['like', 'dislike', 'save']:
        return Response(
            {'success': False, 'error': 'action geçersiz. like, dislike veya save olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Preference oluştur veya güncelle
    preference, created = PlacePreference.objects.update_or_create(
        user=user,
        place=place,
        defaults={'action': action}
    )
    
    # Behavior Tracking - Kullanıcı davranışını kaydet
    action_type_map = {
        'like': 'swipe_like',
        'dislike': 'swipe_dislike',
        'save': 'swipe_save'
    }
    
    # Bağlamsal bilgiler
    now = timezone.now()
    context = {
        'time_of_day': now.strftime('%H:%M'),
        'day_of_week': now.strftime('%A').lower(),
        'device': request.META.get('HTTP_USER_AGENT', 'unknown')[:50]
    }
    
    # Behavior kaydı oluştur
    UserBehavior.objects.create(
        user=user,
        place=place,
        action_type=action_type_map.get(action, 'swipe_like'),
        context=context,
        session_id=request.session.session_key or ''
    )
    
    # UserScore'a puan ekle (like için +5, save için +3)
    if action == 'like':
        from social.models import UserScore
        score, _ = UserScore.objects.get_or_create(user=user)
        score.city = user.profile.city or ''
        score.total_points += 5
        score.save()
        points_earned = 5
    elif action == 'save':
        from social.models import UserScore
        score, _ = UserScore.objects.get_or_create(user=user)
        score.city = user.profile.city or ''
        score.total_points += 3
        score.save()
        points_earned = 3
    else:
        points_earned = 0
    
    # Taste profile'ı güncelle (asenkron olarak)
    try:
        from accounts.taste_profile import calculate_taste_profile_for_user
        calculate_taste_profile_for_user(user, min_interactions=5)
    except Exception as e:
        print(f"Taste profile update error: {e}")
    
    return Response({
        'success': True,
        'message': f'Mekan {preference.get_action_display()} olarak kaydedildi',
        'action': action,
        'points_earned': points_earned,
        'created': created
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preferences(request):
    """
    Kullanıcının favori listelerini getirir
    """
    user = request.user
    action = request.query_params.get('action', None)  # like, dislike, save
    
    if action and action not in ['like', 'dislike', 'save']:
        return Response(
            {'success': False, 'error': 'Geçersiz action'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if action:
        preferences = PlacePreference.objects.filter(user=user, action=action)
    else:
        preferences = PlacePreference.objects.filter(user=user)
    
    places = [pref.place for pref in preferences]
    serializer = PlaceSerializer(places, many=True)
    
    return Response({
        'success': True,
        'places': serializer.data,
        'count': len(serializer.data)
    })
