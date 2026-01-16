"""
Advanced Features - Üst Seviye Özellikler
- Social Matching
- Local Discovery Graph
- Contextual Recommendations
"""
from django.db.models import Q, Count, F
from .models import Place, PlacePreference, SocialMatching, PlaceGraph, UserBehavior
from social.models import Friendship
from accounts.models import User


def calculate_social_matching(user, place):
    """
    Sosyal eşleştirme skorunu hesaplar
    Arkadaşların bu mekanla etkileşimlerine göre
    """
    # Kullanıcının arkadaşlarını al
    friendships = Friendship.objects.filter(
        Q(user1=user, status='accepted') | Q(user2=user, status='accepted')
    )
    
    friend_ids = []
    for friendship in friendships:
        if friendship.user1 == user:
            friend_ids.append(friendship.user2.id)
        else:
            friend_ids.append(friendship.user1.id)
    
    if not friend_ids:
        return None
    
    # Arkadaşların bu mekanla etkileşimleri
    friend_likes = PlacePreference.objects.filter(
        user_id__in=friend_ids,
        place=place,
        action='like'
    ).count()
    
    friend_visits = UserBehavior.objects.filter(
        user_id__in=friend_ids,
        place=place,
        action_type='visit'
    ).count()
    
    friend_reviews = UserBehavior.objects.filter(
        user_id__in=friend_ids,
        place=place,
        action_type='review'
    ).count()
    
    # Eşleşme skoru hesapla (0-1)
    total_friends = len(friend_ids)
    if total_friends == 0:
        match_score = 0.0
    else:
        # Ağırlıklı skor
        like_weight = friend_likes * 0.5
        visit_weight = friend_visits * 0.3
        review_weight = friend_reviews * 0.2
        match_score = min(1.0, (like_weight + visit_weight + review_weight) / total_friends)
    
    # SocialMatching kaydını oluştur veya güncelle
    social_match, created = SocialMatching.objects.update_or_create(
        user=user,
        place=place,
        defaults={
            'friend_likes': friend_likes,
            'friend_visits': friend_visits,
            'friend_reviews': friend_reviews,
            'match_score': match_score
        }
    )
    
    return social_match


def build_place_graph(place):
    """
    Local Discovery Graph - Mekan için ilişkileri oluştur/güncelle
    """
    # 1. Benzer mekanlar (similar_places field'ından)
    if place.similar_places:
        for similar_name in place.similar_places:
            try:
                similar_place = Place.objects.get(name=similar_name)
                PlaceGraph.objects.update_or_create(
                    from_place=place,
                    to_place=similar_place,
                    relationship_type='similar',
                    defaults={'strength': 0.8}
                )
            except Place.DoesNotExist:
                pass
    
    # 2. Aynı kategori
    if place.categories:
        same_category_places = Place.objects.filter(
            categories__overlap=place.categories
        ).exclude(id=place.id)[:5]
        
        for related_place in same_category_places:
            PlaceGraph.objects.update_or_create(
                from_place=place,
                to_place=related_place,
                relationship_type='same_category',
                defaults={'strength': 0.6}
            )
    
    # 3. Aynı atmosfer (tags'den)
    if place.tags:
        same_atmosphere_places = Place.objects.filter(
            tags__overlap=place.tags
        ).exclude(id=place.id)[:5]
        
        for related_place in same_atmosphere_places:
            PlaceGraph.objects.update_or_create(
                from_place=place,
                to_place=related_place,
                relationship_type='same_atmosphere',
                defaults={'strength': 0.7}
            )
    
    # 4. Birlikte beğenilen mekanlar (co-like)
    # Aynı kullanıcıların beğendiği mekanlar
    users_who_liked = PlacePreference.objects.filter(
        place=place,
        action='like'
    ).values_list('user_id', flat=True)
    
    if users_who_liked:
        co_liked_places = Place.objects.filter(
            preferences__user_id__in=users_who_liked,
            preferences__action='like'
        ).exclude(id=place.id).annotate(
            co_like_count=Count('preferences')
        ).order_by('-co_like_count')[:5]
        
        for related_place in co_liked_places:
            strength = min(1.0, related_place.co_like_count / 10.0)  # Normalize
            PlaceGraph.objects.update_or_create(
                from_place=place,
                to_place=related_place,
                relationship_type='user_co_like',
                defaults={
                    'strength': strength,
                    'co_like_count': related_place.co_like_count
                }
            )


def get_contextual_recommendations(user, context=None):
    """
    Bağlamsal öneriler - Kullanıcının mevcut durumuna göre
    context: {
        'time_of_day': '17:00',
        'day_of_week': 'monday',
        'location': 'Moda',
        'purpose': 'work' | 'date' | 'friends' | 'solo'
    }
    """
    if not context:
        context = {}
    
    # Kullanıcının beğendiği mekanları al
    liked_places = PlacePreference.objects.filter(
        user=user,
        action='like'
    ).values_list('place_id', flat=True)
    
    if not liked_places:
        return []
    
    # Graph'tan ilişkili mekanları bul
    recommendations = []
    
    # 1. Beğenilen mekanlardan graph üzerinden öneriler
    for liked_place_id in liked_places[:5]:  # İlk 5 beğenilen
        connections = PlaceGraph.objects.filter(
            from_place_id=liked_place_id,
            strength__gte=0.5
        ).order_by('-strength')[:3]
        
        for connection in connections:
            # Kullanıcı daha önce swipe yapmış mı?
            if not PlacePreference.objects.filter(
                user=user,
                place=connection.to_place
            ).exists():
                recommendations.append({
                    'place': connection.to_place,
                    'score': connection.strength,
                    'reason': f"{connection.from_place.name} ile benzer",
                    'relationship': connection.relationship_type
                })
    
    # 2. Bağlamsal filtreleme
    purpose = context.get('purpose')
    if purpose:
        recommendations = [
            r for r in recommendations
            if r['place'].use_cases and r['place'].use_cases.get(purpose, False)
        ]
    
    # 3. Zaman bazlı filtreleme
    time_of_day = context.get('time_of_day')
    if time_of_day:
        # best_time_to_visit'e göre filtrele
        hour = int(time_of_day.split(':')[0]) if ':' in time_of_day else None
        if hour:
            recommendations = [
                r for r in recommendations
                if r['place'].best_time_to_visit or True  # Şimdilik hepsini al
            ]
    
    # Skora göre sırala ve döndür
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:10]  # Top 10
