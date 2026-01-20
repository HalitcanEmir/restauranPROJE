from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Exists, OuterRef
from django.utils import timezone
from datetime import datetime
import math
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
    mode = request.query_params.get('mode', None)  # Normal keşfet sayfası için
    search = request.query_params.get('search', None)  # Normal keşfet sayfası için
    show_all = request.query_params.get('show_all', 'false').lower() == 'true'  # Tüm mekanları göster
    
    # Eğer show_all=True ise, swipe yapılmış mekanları da göster
    if show_all:
        places = Place.objects.all()
    else:
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
    
    if search:
        places = places.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(address__icontains=search)
        )
    
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
    
    if mode:
        places_list = [p for p in places_list if mode in (p.categories or [])]
    
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


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    İki koordinat arasındaki mesafeyi km cinsinden hesaplar (Haversine formülü)
    """
    # Dünya yarıçapı (km)
    R = 6371
    
    # Dereceyi radyana çevir
    lat1_rad = math.radians(float(lat1))
    lon1_rad = math.radians(float(lon1))
    lat2_rad = math.radians(float(lat2))
    lon2_rad = math.radians(float(lon2))
    
    # Farklar
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Haversine formülü
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_places(request):
    """
    Belirli bir koordinat etrafındaki yakın mekanları getirir
    Query params:
        - lat: Enlem (zorunlu)
        - lon: Boylam (zorunlu)
        - radius: Yarıçap (km, varsayılan: 5)
        - limit: Maksimum sonuç sayısı (varsayılan: 20)
    """
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')
    radius = float(request.query_params.get('radius', 5))  # Varsayılan 5 km
    limit = int(request.query_params.get('limit', 20))
    
    if not lat or not lon:
        return Response(
            {'success': False, 'error': 'lat ve lon parametreleri gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return Response(
            {'success': False, 'error': 'lat ve lon sayısal değer olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Koordinatı olan mekanları al
    places = Place.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False
    )
    
    # Mesafe hesapla ve filtrele
    places_with_distance = []
    for place in places:
        distance = calculate_distance(lat, lon, place.latitude, place.longitude)
        if distance <= radius:
            places_with_distance.append({
                'place': place,
                'distance': round(distance, 2)
            })
    
    # Mesafeye göre sırala
    places_with_distance.sort(key=lambda x: x['distance'])
    
    # Limit uygula
    places_with_distance = places_with_distance[:limit]
    
    # Serialize et
    places_list = [item['place'] for item in places_with_distance]
    serializer = PlaceSerializer(places_list, many=True)
    
    # Mesafe bilgisini ekle
    result_data = []
    for i, item in enumerate(places_with_distance):
        place_data = serializer.data[i]
        place_data['distance_km'] = item['distance']
        result_data.append(place_data)
    
    return Response({
        'success': True,
        'places': result_data,
        'count': len(result_data),
        'center': {'lat': lat, 'lon': lon},
        'radius': radius
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def place_location(request, place_id):
    """
    Belirli bir mekanın konum bilgilerini getirir
    """
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        'success': True,
        'place': {
            'id': place.id,
            'name': place.name,
            'address': place.address,
            'city': place.city,
            'latitude': float(place.latitude) if place.latitude else None,
            'longitude': float(place.longitude) if place.longitude else None,
        }
    })
