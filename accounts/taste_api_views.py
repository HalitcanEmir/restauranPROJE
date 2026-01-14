from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserTasteProfile
from .taste_profile import calculate_taste_profile_for_user
from places.models import PlacePreference
from visits.models import Visit


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_taste_profile(request):
    """
    Kullanıcının zevk profilini döner
    GET /api/me/taste-profile/
    """
    user = request.user
    
    # Mevcut profili kontrol et
    try:
        profile = UserTasteProfile.objects.get(user=user)
    except UserTasteProfile.DoesNotExist:
        profile = None
    
    # Etkileşim sayısını hesapla
    preference_count = PlacePreference.objects.filter(user=user).count()
    visit_count = Visit.objects.filter(user=user).count()
    interaction_count = preference_count + visit_count
    
    # Yeterli veri var mı?
    min_interactions = 5
    has_enough_data = interaction_count >= min_interactions
    
    # Eğer profil yoksa ve yeterli veri varsa, hesapla
    if not profile and has_enough_data:
        profile = calculate_taste_profile_for_user(user, min_interactions)
    
    # Eğer profil varsa ama eskiyse (son 10 etkileşimden sonra), yeniden hesapla
    if profile and has_enough_data:
        # Son güncelleme zamanına göre kontrol (basit bir yaklaşım)
        # Her 10 yeni etkileşimde bir güncelle
        if interaction_count % 10 == 0 or not profile.category_weights:
            profile = calculate_taste_profile_for_user(user, min_interactions)
    
    if not profile or not has_enough_data:
        return Response({
            'success': False,
            'has_enough_data': False,
            'interaction_count': interaction_count,
            'min_interactions': min_interactions,
            'message': f'Zevk profilini çıkarabilmemiz için en az {min_interactions} mekanla etkileşime geçmen gerekiyor. Şu an {interaction_count} etkileşimin var.'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': True,
        'has_enough_data': True,
        'interaction_count': interaction_count,
        'style_label': profile.style_label,
        'category_weights': profile.category_weights,
        'atmosphere_weights': profile.atmosphere_weights,
        'context_weights': profile.context_weights,
        'updated_at': profile.updated_at.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recalculate_taste_profile(request):
    """
    Zevk profilini yeniden hesaplar
    POST /api/me/taste-profile/recalculate/
    """
    user = request.user
    
    try:
        profile = calculate_taste_profile_for_user(user, min_interactions=5)
        
        if profile:
            return Response({
                'success': True,
                'message': 'Zevk profili başarıyla güncellendi',
                'style_label': profile.style_label,
                'category_weights': profile.category_weights,
                'atmosphere_weights': profile.atmosphere_weights,
                'context_weights': profile.context_weights,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Yeterli veri yok. En az 5 mekanla etkileşime geçmen gerekiyor.'
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
