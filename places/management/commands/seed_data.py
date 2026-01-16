"""
Management command to seed the database with realistic data
20 kullanıcı için yorumlar, değerlendirmeler ve zenginleştirilmiş mekan bilgileri
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from places.models import Place
from visits.models import Visit
from accounts.models import Profile
import random
from datetime import datetime, timedelta

User = get_user_model()

# Örnek yorumlar ve değerlendirmeler
SAMPLE_COMMENTS = [
    {
        'rating': 5,
        'comment': 'Çok sessiz ve huzurlu bir ortam. Laptop ile çalışmak için mükemmel. Kahve kalitesi harika!',
        'atmosphere': ['sessiz', 'huzurlu', 'rahat'],
        'suitable_for': ['arkadaş', 'tek başına'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Güzel bir mekan, kahve iyi ama biraz pahalı. Atmosfer çok hoş.',
        'atmosphere': ['estetik', 'modern'],
        'suitable_for': ['arkadaş', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'Mükemmel bir çalışma ortamı! Wi-Fi hızlı, prizler var, sessiz. Kesinlikle tekrar geleceğim.',
        'atmosphere': ['sessiz', 'rahat'],
        'suitable_for': ['tek başına', 'iş'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Kahve çok iyi, personel nazik. Sadece biraz kalabalık olabiliyor öğle saatlerinde.',
        'atmosphere': ['samimi', 'canlı'],
        'suitable_for': ['arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'En sevdiğim kafe! Avokado tost harika, ortam çok sıcak. Hafta sonu kahvaltı için ideal.',
        'atmosphere': ['sıcak', 'samimi', 'rahat'],
        'suitable_for': ['arkadaş', 'aile', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Güzel bir yer ama biraz küçük. Kahve kalitesi yüksek, fiyatlar makul.',
        'atmosphere': ['estetik', 'minimal'],
        'suitable_for': ['arkadaş', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'Flat white mükemmel! Ortam çok sessiz, kitap okumak için ideal. Personel çok yardımsever.',
        'atmosphere': ['sessiz', 'huzurlu', 'kitap dostu'],
        'suitable_for': ['tek başına', 'arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'İyi bir kafe, kahve güzel ama menü sınırlı. Ortam hoş, çalışmak için uygun.',
        'atmosphere': ['rahat', 'sessiz'],
        'suitable_for': ['tek başına', 'iş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'San Sebastian tatlısı harika! Ortam çok estetik, fotoğraf çekmek için mükemmel.',
        'atmosphere': ['estetik', 'instagramable', 'modern'],
        'suitable_for': ['arkadaş', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Güzel bir mekan, kahve iyi ama biraz gürültülü olabiliyor. Hafta içi daha sakin.',
        'atmosphere': ['canlı', 'samimi'],
        'suitable_for': ['arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'Mükemmel bir keşif! Üçüncü dalga kahve, lokal bir atmosfer. Kesinlikle tekrar geleceğim.',
        'atmosphere': ['lokal', 'üçüncü dalga', 'sıcak'],
        'suitable_for': ['arkadaş', 'tek başına'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'İyi bir kafe, kahve kalitesi yüksek. Sadece masa sayısı az, rezervasyon yapmak gerekebilir.',
        'atmosphere': ['samimi', 'rahat'],
        'suitable_for': ['arkadaş', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'En iyi çalışma kafelerinden biri! Wi-Fi hızlı, prizler her masada, sessizlik mükemmel.',
        'atmosphere': ['sessiz', 'rahat', 'çalışma dostu'],
        'suitable_for': ['tek başına', 'iş'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Güzel bir yer, kahve iyi ama fiyatlar biraz yüksek. Ortam hoş, date için ideal.',
        'atmosphere': ['romantik', 'sessiz', 'estetik'],
        'suitable_for': ['date', 'arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'Harika bir kafe! Brownie çok lezzetli, kahve mükemmel. Personel çok nazik ve hızlı.',
        'atmosphere': ['sıcak', 'samimi', 'rahat'],
        'suitable_for': ['arkadaş', 'aile'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'İyi bir mekan, kahve kalitesi yüksek. Sadece biraz küçük, kalabalık olabiliyor.',
        'atmosphere': ['canlı', 'samimi'],
        'suitable_for': ['arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'Mükemmel bir keşif! Ortam çok huzurlu, kahve harika. Kitap okumak için ideal bir yer.',
        'atmosphere': ['sessiz', 'huzurlu', 'kitap dostu'],
        'suitable_for': ['tek başına', 'arkadaş'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'Güzel bir kafe, kahve iyi ama menü biraz sınırlı. Ortam hoş, çalışmak için uygun.',
        'atmosphere': ['rahat', 'sessiz'],
        'suitable_for': ['tek başına', 'iş'],
        'sentiment': 'positive'
    },
    {
        'rating': 5,
        'comment': 'En sevdiğim kafelerden biri! Avokado tost harika, kahve mükemmel. Hafta sonu kahvaltı için ideal.',
        'atmosphere': ['sıcak', 'samimi', 'rahat'],
        'suitable_for': ['arkadaş', 'aile', 'date'],
        'sentiment': 'positive'
    },
    {
        'rating': 4,
        'comment': 'İyi bir yer, kahve kalitesi yüksek. Sadece biraz pahalı. Ortam çok hoş.',
        'atmosphere': ['estetik', 'modern'],
        'suitable_for': ['arkadaş', 'date'],
        'sentiment': 'positive'
    },
]

# Zenginleştirilmiş mekan bilgileri
PLACE_ENRICHMENTS = {
    'atmosphere_profile': {
        'noise_level': 'düşük',
        'lighting': 'soft',
        'vibe': 'chill',
        'mode': ['chill', 'creative work', 'friend talk'],
        'table_size': 'geniş'
    },
    'behavior_stats': {
        'average_stay_minutes': 87,
        'laptop_ratio': 63,
        'quietness_level': 'düşük gürültü',
        'power_outlets': 'bazı masalarda'
    },
    'price_range': {
        'min': 130,
        'max': 200,
        'currency': '₺'
    },
    'menu_highlights': [
        {'name': 'Flat White', 'rating': 'iyi', 'emoji': '☕'},
        {'name': 'Avokado tost', 'rating': 'harika', 'emoji': '🥪'},
        {'name': 'San Sebastian', 'rating': 'tatlıcılar beğeniyor', 'emoji': '🍰'},
        {'name': 'Brownie', 'rating': 'orta', 'emoji': '🧁'}
    ],
    'popular_orders': [
        {'item': 'Flat White', 'percentage': 42},
        {'item': 'Avokado tost', 'percentage': 28},
        {'item': 'Cold brew', 'percentage': 15},
        {'item': 'San Sebastian', 'percentage': 10}
    ],
    'vibe_tags': ['Chill', 'Third-wave coffee', 'Local', 'Neutral interiors'],
    'similar_places': ['Montag', 'Nopa', 'Petra Cihangir'],
    'target_audience': [
        'sessiz ortam + kahve + sohbet',
        'estetik arayanlar',
        'laptop çalışanlar',
        'küçük sosyal gruplar'
    ],
    'use_cases': {
        'work': True,
        'friends': True,
        'date': True,
        'solo': True,
        'group': False,
        'family': False
    },
    'best_time_to_visit': 'Hafta içi 17:00–20:00',
    'one_line_summary': 'Sessiz çalışayım, iki kahve içeyim, hafif sohbet olsun mekanı',
    'rating_breakdown': {
        'atmosphere': 4.7,
        'coffee': 4.3,
        'value': 4.0,
        'staff': 4.6
    }
}


class Command(BaseCommand):
    help = 'Seed database with realistic data: 20 users, reviews, and enriched place information'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting data seeding...'))
        
        # 1. Kullanıcıları oluştur veya al
        users = self.get_or_create_users()
        self.stdout.write(self.style.SUCCESS(f'✓ {len(users)} users ready'))
        
        # 2. Mekanları al
        places = Place.objects.all()
        if not places.exists():
            self.stdout.write(self.style.ERROR('No places found! Please create places first.'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'✓ {places.count()} places found'))
        
        # 3. Mekanları zenginleştir
        self.enrich_places(places)
        self.stdout.write(self.style.SUCCESS('✓ Places enriched'))
        
        # 4. Her mekan için yorumlar oluştur
        total_visits = 0
        for place in places:
            visits_created = self.create_visits_for_place(place, users)
            total_visits += visits_created
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_visits} visits/reviews'))
        self.stdout.write(self.style.SUCCESS('\n✅ Data seeding completed successfully!'))
    
    def get_or_create_users(self):
        """20 kullanıcı oluştur veya al"""
        users = []
        existing_users = list(User.objects.all())
        
        # Mevcut kullanıcıları kullan
        if len(existing_users) >= 20:
            return existing_users[:20]
        
        # Eksik kullanıcıları oluştur
        needed = 20 - len(existing_users)
        for i in range(needed):
            username = f'user_{i+1}_{random.randint(1000, 9999)}'
            email = f'{username}@example.com'
            
            # Kullanıcı oluştur
            user = User.objects.create_user(
                username=username,
                email=email,
                password='testpass123'
            )
            
            # Profile oluştur
            Profile.objects.get_or_create(
                user=user,
                defaults={
                    'display_name': f'Kullanıcı {i+1}',
                    'city': random.choice(['İstanbul', 'Ankara', 'İzmir', 'Bursa'])
                }
            )
            
            users.append(user)
            self.stdout.write(f'  Created user: {username}')
        
        return existing_users + users
    
    def enrich_places(self, places):
        """Mekanları zenginleştirilmiş bilgilerle doldur"""
        for place in places:
            # Sadece boş alanları doldur
            if not place.atmosphere_profile:
                place.atmosphere_profile = PLACE_ENRICHMENTS['atmosphere_profile'].copy()
            
            if not place.behavior_stats:
                place.behavior_stats = PLACE_ENRICHMENTS['behavior_stats'].copy()
            
            if not place.price_range:
                place.price_range = PLACE_ENRICHMENTS['price_range'].copy()
            
            if not place.menu_highlights:
                place.menu_highlights = PLACE_ENRICHMENTS['menu_highlights'].copy()
            
            if not place.popular_orders:
                place.popular_orders = PLACE_ENRICHMENTS['popular_orders'].copy()
            
            if not place.vibe_tags:
                place.vibe_tags = PLACE_ENRICHMENTS['vibe_tags'].copy()
            
            if not place.similar_places:
                place.similar_places = PLACE_ENRICHMENTS['similar_places'].copy()
            
            if not place.target_audience:
                place.target_audience = PLACE_ENRICHMENTS['target_audience'].copy()
            
            if not place.use_cases:
                place.use_cases = PLACE_ENRICHMENTS['use_cases'].copy()
            
            if not place.best_time_to_visit:
                place.best_time_to_visit = PLACE_ENRICHMENTS['best_time_to_visit']
            
            if not place.one_line_summary:
                place.one_line_summary = PLACE_ENRICHMENTS['one_line_summary']
            
            # Çalışma uygunluğu ve Wi-Fi
            if place.working_suitability == 0:
                place.working_suitability = 85
            
            if not place.wifi_quality:
                place.wifi_quality = 'güçlü'
            
            if not place.power_outlets:
                place.power_outlets = 'bazı masalarda'
            
            place.save()
    
    def create_visits_for_place(self, place, users):
        """Bir mekan için yorumlar oluştur"""
        # Her mekan için 15-20 yorum oluştur
        num_visits = random.randint(15, 20)
        visits_created = 0
        
        # Rastgele kullanıcılar seç
        selected_users = random.sample(users, min(num_visits, len(users)))
        
        for i, user in enumerate(selected_users):
            # Bu kullanıcı bu mekan için zaten yorum yapmış mı?
            if Visit.objects.filter(user=user, place=place).exists():
                continue
            
            # Rastgele bir yorum seç
            comment_data = random.choice(SAMPLE_COMMENTS)
            
            # Rastgele bir tarih (son 6 ay içinde)
            days_ago = random.randint(1, 180)
            visited_at = datetime.now() - timedelta(days=days_ago)
            
            # Visit oluştur
            visit = Visit.objects.create(
                user=user,
                place=place,
                visited_at=visited_at,
                rating=comment_data['rating'],
                comment=comment_data['comment'],
                atmosphere=comment_data['atmosphere'],
                suitable_for=comment_data['suitable_for'],
                sentiment=comment_data['sentiment'],
                with_whom=random.choice(['arkadaş', 'tek başına', 'sevgili', 'aile'])
            )
            
            visits_created += 1
        
        return visits_created
