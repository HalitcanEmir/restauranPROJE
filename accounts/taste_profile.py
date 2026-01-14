"""
Kullanıcı Zevk Profili Hesaplama Modülü
"""
from collections import defaultdict
from django.db.models import Q
from .models import UserTasteProfile
from places.models import PlacePreference
from visits.models import Visit


def calculate_taste_profile_for_user(user, min_interactions=5):
    """
    Kullanıcının zevk profilini hesaplar
    
    Args:
        user: User objesi
        min_interactions: Minimum etkileşim sayısı (profil çıkarabilmek için)
    
    Returns:
        UserTasteProfile objesi veya None (yeterli veri yoksa)
    """
    # Kullanıcının tüm etkileşimlerini topla
    interactions = []
    
    # Swipe etkileşimleri (PlacePreference)
    preferences = PlacePreference.objects.filter(user=user).select_related('place')
    for pref in preferences:
        interactions.append({
            'type': 'swipe',
            'action': pref.action,
            'place': pref.place,
            'rating': None,
            'timestamp': pref.timestamp
        })
    
    # Review etkileşimleri (Visit)
    visits = Visit.objects.filter(user=user).select_related('place')
    for visit in visits:
        interactions.append({
            'type': 'review',
            'action': 'review',
            'place': visit.place,
            'rating': visit.rating,
            'timestamp': visit.visited_at,
            'atmosphere': visit.atmosphere or [],
            'suitable_for': visit.suitable_for or [],
        })
    
    # Yeterli veri kontrolü
    if len(interactions) < min_interactions:
        return None
    
    # Ağırlık skorları
    category_scores = defaultdict(float)
    atmosphere_scores = defaultdict(float)
    context_scores = defaultdict(float)
    
    # Her etkileşim için skor hesapla
    for interaction in interactions:
        place = interaction['place']
        action = interaction['action']
        rating = interaction.get('rating')
        
        # Temel ağırlık
        weight = 1.0
        
        if action == 'like':
            weight = 1.0
        elif action == 'save':
            weight = 0.7
        elif action == 'dislike':
            weight = -1.0
        elif action == 'review':
            # Review için rating'e göre ağırlık
            if rating:
                if rating >= 4:
                    weight = 1.2
                elif rating <= 2:
                    weight = -1.2
                else:
                    weight = 0.5
            else:
                weight = 0.5
        
        # Kategoriler
        categories = place.categories or []
        for cat in categories:
            category_scores[cat] += weight
        
        # Atmosfer (tags)
        tags = place.tags or []
        for tag in tags:
            atmosphere_scores[tag] += weight
        
        # Review'den gelen atmosphere ve suitable_for
        if interaction['type'] == 'review':
            for atm in interaction.get('atmosphere', []):
                atmosphere_scores[atm] += weight * 0.8  # Biraz daha az ağırlık
            
            for ctx in interaction.get('suitable_for', []):
                context_scores[ctx] += weight
        
        # Place'in kategorilerinden suitable_for çıkar (eğer varsa)
        # Örn: 'dost', 'sevgili', 'aile' gibi kategoriler context olabilir
        context_categories = ['dost', 'arkadaş', 'sevgili', 'aile', 'tek', 'is']
        for cat in categories:
            if cat in context_categories:
                # 'dost' ve 'arkadaş' aynı şey
                ctx_key = 'arkadaş' if cat == 'dost' else cat
                context_scores[ctx_key] += weight * 0.5
    
    # Negatif değerleri 0'a çek ve normalize et
    category_weights = normalize_scores(category_scores)
    atmosphere_weights = normalize_scores(atmosphere_scores)
    context_weights = normalize_scores(context_scores)
    
    # Style label oluştur
    style_label = build_style_label(category_weights, atmosphere_weights)
    
    # Veritabanına kaydet
    profile, created = UserTasteProfile.objects.get_or_create(user=user)
    profile.category_weights = category_weights
    profile.atmosphere_weights = atmosphere_weights
    profile.context_weights = context_weights
    profile.style_label = style_label
    profile.save()
    
    return profile


def normalize_scores(scores_dict):
    """
    Skorları normalize eder (toplamı 1.0 olacak şekilde)
    Negatif değerleri 0'a çeker
    """
    # Negatif değerleri 0'a çek
    positive_scores = {k: max(0, v) for k, v in scores_dict.items()}
    
    # Toplamı hesapla
    total = sum(positive_scores.values())
    
    if total == 0:
        return {}
    
    # Normalize et
    normalized = {k: v / total for k, v in positive_scores.items()}
    
    # En yüksek değerleri sırala ve döndür
    sorted_items = sorted(normalized.items(), key=lambda x: x[1], reverse=True)
    return dict(sorted_items[:10])  # En yüksek 10 değer


def build_style_label(category_weights, atmosphere_weights):
    """
    Style label oluşturur
    Örn: "Brunch + Kahve + Estetik"
    """
    if not category_weights and not atmosphere_weights:
        return "Henüz profil oluşturulamadı"
    
    # Kategori isimlerini düzelt
    category_labels = {
        'kafe': 'Kahve',
        'coffee': 'Kahve',
        'restoran': 'Restoran',
        'restaurant': 'Restoran',
        'bar': 'Bar',
        'brunch': 'Brunch',
        'tatlı': 'Tatlı',
        'dessert': 'Tatlı'
    }
    
    # En yüksek 2-3 kategori
    top_categories = sorted(category_weights.items(), key=lambda x: x[1], reverse=True)[:2]
    category_names = []
    for cat, _ in top_categories:
        label = category_labels.get(cat, cat.replace('_', ' ').title())
        category_names.append(label)
    
    # En yüksek 1-2 atmosfer
    top_atmospheres = sorted(atmosphere_weights.items(), key=lambda x: x[1], reverse=True)[:1]
    atmosphere_names = [atm.replace('_', ' ').title() for atm, _ in top_atmospheres]
    
    # Birleştir
    parts = category_names + atmosphere_names
    if parts:
        return " + ".join(parts)
    
    return "Profil oluşturuluyor..."
