"""
Recommendation Engine V1 - Rule-based recommendation system
"""
from collections import defaultdict
from django.db.models import Q
from places.models import Place, PlacePreference
from accounts.models import UserTasteProfile


def calculate_match_score(place, query_params, taste_profile=None):
    """
    Bir mekan için öneri skoru hesaplar
    
    Args:
        place: Place objesi
        query_params: dict - category, atmosphere, context, price
        taste_profile: UserTasteProfile objesi (opsiyonel)
    
    Returns:
        float: 0.0 - 1.0 arası skor
    """
    # Category match (0.4 ağırlık)
    category_score = calculate_category_match(place, query_params.get('category', []), taste_profile)
    
    # Atmosphere match (0.3 ağırlık)
    atmosphere_score = calculate_atmosphere_match(place, query_params.get('atmosphere', []), taste_profile)
    
    # Context match (0.2 ağırlık)
    context_score = calculate_context_match(place, query_params.get('context'), taste_profile)
    
    # Price match (0.1 ağırlık)
    price_score = calculate_price_match(place, query_params.get('price'), taste_profile)
    
    # Toplam skor
    total_score = (
        category_score * 0.4 +
        atmosphere_score * 0.3 +
        context_score * 0.2 +
        price_score * 0.1
    )
    
    return min(1.0, max(0.0, total_score))


def calculate_category_match(place, query_categories, taste_profile=None):
    """
    Kategori eşleşme skoru hesaplar
    
    Returns:
        1.0 → tüm kategoriler uyuyor
        0.5 → kısmi eşleşme
        0.0 → eşleşme yok
    """
    place_categories = set(place.categories or [])
    
    # Query'den kategori varsa onu kullan
    if query_categories:
        query_cat_set = set(query_categories)
        if query_cat_set.issubset(place_categories):
            return 1.0
        elif query_cat_set.intersection(place_categories):
            return 0.5
        return 0.0
    
    # Taste profile'dan kategori kullan
    if taste_profile and taste_profile.category_weights:
        # En yüksek ağırlıklı kategorileri al (top 2)
        top_categories = sorted(
            taste_profile.category_weights.items(),
            key=lambda x: x[1],
            reverse=True
        )[:2]
        
        top_cat_names = set([cat for cat, _ in top_categories])
        if top_cat_names.issubset(place_categories):
            return 1.0
        elif top_cat_names.intersection(place_categories):
            return 0.5
        return 0.0
    
    # Hiçbir şey yoksa 0.5 döndür (nötr)
    return 0.5


def calculate_atmosphere_match(place, query_atmospheres, taste_profile=None):
    """
    Atmosfer eşleşme skoru hesaplar
    
    Returns:
        1.0 → tüm atmosferler uyuyor
        0.5 → kısmi eşleşme
        0.0 → eşleşme yok
    """
    place_tags = set(place.tags or [])
    
    # Query'den atmosfer varsa onu kullan
    if query_atmospheres:
        query_atm_set = set(query_atmospheres)
        if query_atm_set.issubset(place_tags):
            return 1.0
        elif query_atm_set.intersection(place_tags):
            return 0.5
        return 0.0
    
    # Taste profile'dan atmosfer kullan
    if taste_profile and taste_profile.atmosphere_weights:
        # En yüksek ağırlıklı atmosferleri al (top 2)
        top_atmospheres = sorted(
            taste_profile.atmosphere_weights.items(),
            key=lambda x: x[1],
            reverse=True
        )[:2]
        
        top_atm_names = set([atm for atm, _ in top_atmospheres])
        if top_atm_names.issubset(place_tags):
            return 1.0
        elif top_atm_names.intersection(place_tags):
            return 0.5
        return 0.0
    
    # Hiçbir şey yoksa 0.5 döndür (nötr)
    return 0.5


def calculate_context_match(place, query_context, taste_profile=None):
    """
    Context (kiminle gidilir) eşleşme skoru hesaplar
    
    Returns:
        Taste Profile'daki ağırlık değeri (0.0 - 1.0)
    """
    place_categories = set(place.categories or [])
    
    # Context kategorileri
    context_categories = ['dost', 'arkadaş', 'sevgili', 'aile', 'tek', 'is']
    
    # Query'den context varsa
    if query_context:
        # Context'i kategoriye çevir
        context_mapping = {
            'friends': 'arkadaş',
            'arkadaş': 'arkadaş',
            'dost': 'arkadaş',
            'sevgili': 'sevgili',
            'aile': 'aile',
            'tek': 'tek',
            'solo': 'tek',
            'is': 'is',
            'work': 'is'
        }
        
        context_key = context_mapping.get(query_context.lower(), query_context.lower())
        
        # Place'de bu context var mı?
        if context_key in place_categories or 'dost' in place_categories and context_key == 'arkadaş':
            # Taste profile'dan ağırlık al
            if taste_profile and taste_profile.context_weights:
                return taste_profile.context_weights.get(context_key, 0.5)
            return 1.0
        return 0.0
    
    # Taste profile'dan context kullan
    if taste_profile and taste_profile.context_weights:
        # En yüksek ağırlıklı context'i al
        top_context = sorted(
            taste_profile.context_weights.items(),
            key=lambda x: x[1],
            reverse=True
        )[0] if taste_profile.context_weights else None
        
        if top_context:
            context_key, weight = top_context
            # Place'de bu context var mı?
            if context_key in place_categories or ('dost' in place_categories and context_key == 'arkadaş'):
                return weight
            return 0.0
    
    # Hiçbir şey yoksa 0.5 döndür (nötr)
    return 0.5


def calculate_price_match(place, query_price, taste_profile=None):
    """
    Fiyat eşleşme skoru hesaplar
    
    Returns:
        1.0 → aynı seviye
        0.5 → ±1 seviye
        0.0 → diğer
    """
    place_price = place.price_level or '₺₺'
    
    # Fiyat seviyeleri
    price_levels = ['₺', '₺₺', '₺₺₺']
    
    def get_price_index(price):
        if price in price_levels:
            return price_levels.index(price)
        return 1  # Default ₺₺
    
    # Query'den fiyat varsa
    if query_price:
        query_price_normalized = query_price.replace('$', '₺')
        query_idx = get_price_index(query_price_normalized)
        place_idx = get_price_index(place_price)
        
        diff = abs(query_idx - place_idx)
        if diff == 0:
            return 1.0
        elif diff == 1:
            return 0.5
        return 0.0
    
    # Taste profile'dan fiyat kullan (en çok beğenilen mekanların ortalama fiyatı)
    # Basit bir yaklaşım: varsayılan olarak ₺₺ kabul et
    return 0.5


def get_recommendations(user, query_params=None, limit=10):
    """
    Kullanıcı için öneriler üretir
    
    Args:
        user: User objesi
        query_params: dict - category, atmosphere, context, price
        limit: int - maksimum öneri sayısı
    
    Returns:
        tuple: (query_dict, results_list)
    """
    if query_params is None:
        query_params = {}
    
    # Kullanıcının daha önce swipe yaptığı mekanları al
    swiped_place_ids = list(PlacePreference.objects.filter(
        user=user
    ).values_list('place_id', flat=True))
    
    # Swipe yapılmamış mekanları getir (eğer swipe yapılmışsa)
    if swiped_place_ids:
        places = Place.objects.exclude(id__in=swiped_place_ids)
    else:
        places = Place.objects.all()
    
    # Taste profile'ı al
    try:
        taste_profile = UserTasteProfile.objects.get(user=user)
    except UserTasteProfile.DoesNotExist:
        taste_profile = None
    
    # Query parametrelerini hazırla
    if query_params is None:
        query_params = {}
    
    # Category'yi liste yap
    category = query_params.get('category', [])
    if isinstance(category, str):
        category = [c.strip() for c in category.split(',')]
    
    # Atmosphere'yi liste yap
    atmosphere = query_params.get('atmosphere', [])
    if isinstance(atmosphere, str):
        atmosphere = [a.strip() for a in atmosphere.split(',')]
    
    # Places'i listeye çevir (SQLite uyumluluğu için)
    places_list = list(places)
    
    # Her mekan için skor hesapla
    scored_places = []
    for place in places_list:
        score = calculate_match_score(place, {
            'category': category,
            'atmosphere': atmosphere,
            'context': query_params.get('context'),
            'price': query_params.get('price')
        }, taste_profile)
        
        # Sadece skoru 0'dan büyük olanları ekle
        if score > 0:
            scored_places.append({
                'place': place,
                'score': score
            })
    
    # Skora göre sırala
    scored_places.sort(key=lambda x: x['score'], reverse=True)
    
    # Limit'e göre al
    results = scored_places[:limit]
    
    # Sonuçları formatla
    formatted_results = []
    for item in results:
        place = item['place']
        formatted_results.append({
            'id': place.id,
            'name': place.name,
            'location': place.city or place.address or 'İstanbul',
            'score': round(item['score'], 2),
            'price_level': place.price_level or '₺₺',
            'average_rating': float(place.average_rating) if place.average_rating else 0.0,
            'photos': place.photos or [],
            'short_description': place.short_description or '',
            'categories': place.categories or [],
            'tags': place.tags or []
        })
    
    # Query dict oluştur
    query_dict = {
        'category': category,
        'atmosphere': atmosphere,
        'context': query_params.get('context'),
        'price': query_params.get('price')
    }
    
    return query_dict, formatted_results
