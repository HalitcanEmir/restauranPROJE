from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from accounts.models import User


class Place(models.Model):
    """Mekan Modeli"""
    PRICE_LEVEL_CHOICES = [
        ('₺', '₺ - Ucuz'),
        ('₺₺', '₺₺ - Orta'),
        ('₺₺₺', '₺₺₺ - Pahalı'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=300, blank=True, help_text="Kısa açıklama (vitrin kartı için)")
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100)
    categories = models.JSONField(default=list, help_text="Örn: ['kafe', 'restoran', 'bar']")
    tags = models.JSONField(default=list, help_text="Örn: ['samimi', 'sessiz', 'butik']")
    price_level = models.CharField(max_length=3, choices=PRICE_LEVEL_CHOICES, default='₺₺')
    
    # Yeni alanlar - Swipe keşfet için
    photos = models.JSONField(default=list, help_text="Fotoğraf URL'leri listesi")
    featured_features = models.JSONField(default=list, help_text="Öne çıkan özellikler: ['canlı müzik', 'vegan seçenek']")
    hours = models.JSONField(default=dict, blank=True, help_text="Çalışma saatleri: {'monday': '09:00-22:00'}")
    menu_link = models.URLField(blank=True, null=True, help_text="Menü linki (opsiyonel)")
    
    # Zenginleştirilmiş alanlar - Davranış odaklı discovery için
    # 1. Atmosfer Profili
    atmosphere_profile = models.JSONField(default=dict, blank=True, help_text="Atmosfer detayları: {'noise_level': 'düşük', 'lighting': 'soft', 'vibe': 'chill', 'mode': ['chill', 'creative work'], 'table_size': 'geniş'}")
    working_suitability = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)], help_text="Çalışma uygunluğu % (0-100)")
    wifi_quality = models.CharField(max_length=20, blank=True, help_text="Wi-Fi kalitesi: 'var', 'güçlü', 'yok'")
    power_outlets = models.CharField(max_length=50, blank=True, help_text="Priz durumu: 'bazı masalarda', 'her masada', 'yok'")
    peak_hours = models.JSONField(default=dict, blank=True, help_text="Yoğun saatler: {'start': '13:00', 'end': '18:00'}")
    
    # Davranış İstatistikleri (Behavior Tracking için)
    behavior_stats = models.JSONField(default=dict, blank=True, help_text="Davranış istatistikleri: {'average_stay_minutes': 87, 'laptop_ratio': 63, 'quietness_level': 'düşük gürültü'}")
    
    # 2. Karar Destekleyici Bilgiler
    price_range = models.JSONField(default=dict, blank=True, help_text="Fiyat aralığı: {'min': 110, 'max': 190, 'currency': '₺'}")
    menu_highlights = models.JSONField(default=list, blank=True, help_text="Menü öne çıkanları: [{'name': 'Flat White', 'rating': 'iyi', 'emoji': '☕'}]")
    best_time_to_visit = models.CharField(max_length=200, blank=True, help_text="En iyi ziyaret zamanı: 'Hafta içi 17:00-20:00'")
    
    # 3. Use Case Mapping
    use_cases = models.JSONField(default=dict, blank=True, help_text="Kullanım senaryoları: {'date': True, 'friends': True, 'work': True, 'group': False, 'family': False}")
    
    # 4. Oyunlaştırma & Eğlence
    popular_orders = models.JSONField(default=list, blank=True, help_text="En çok sipariş edilenler: [{'item': 'Latte', 'percentage': 42}]")
    vibe_tags = models.JSONField(default=list, blank=True, help_text="Vibe etiketleri: ['Chill', 'Third-wave coffee', 'Local']")
    similar_places = models.JSONField(default=list, blank=True, help_text="Benzer mekanlar: ['Soho House', 'Petra', 'Montag']")
    
    # 5. Sosyal Kanıt
    owner_description = models.TextField(blank=True, help_text="Dükkan sahibinin açıklaması")
    local_guide_note = models.TextField(blank=True, help_text="Local guide notu")
    
    # 6. Taste Profile Matching
    target_audience = models.JSONField(default=list, blank=True, help_text="Hedef kitle: ['sessiz ortam + kahve + sohbet', 'estetik arayanlar', 'laptop çalışanlar']")
    
    # 7. Bir cümlelik özet
    one_line_summary = models.CharField(max_length=300, blank=True, help_text="Bir cümlelik özet: 'Sessiz çalışayım, iki kahve içeyim' mekanı")
    
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def average_rating(self):
        """Ortalama puan hesapla"""
        from visits.models import Visit
        visits = Visit.objects.filter(place=self)
        if visits.exists():
            return round(visits.aggregate(models.Avg('rating'))['rating__avg'], 2)
        return 0
    
    @property
    def total_visits(self):
        """Toplam ziyaret sayısı"""
        return self.visits.count()


class PlacePreference(models.Model):
    """Kullanıcı mekan tercihleri (Swipe işlemleri)"""
    ACTION_CHOICES = [
        ('like', 'Beğendim'),
        ('dislike', 'Beğenmedim'),
        ('save', 'Kaydet / Favori'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='place_preferences')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='preferences')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'place']
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'action']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} ({self.get_action_display()})"
    
    @classmethod
    def get_liked_places(cls, user):
        """Kullanıcının beğendiği mekanlar"""
        return Place.objects.filter(
            preferences__user=user,
            preferences__action='like'
        ).distinct()
    
    @classmethod
    def get_saved_places(cls, user):
        """Kullanıcının kaydettiği mekanlar"""
        return Place.objects.filter(
            preferences__user=user,
            preferences__action='save'
        ).distinct()
    
    @classmethod
    def get_disliked_places(cls, user):
        """Kullanıcının beğenmediği mekanlar"""
        return Place.objects.filter(
            preferences__user=user,
            preferences__action='dislike'
        ).distinct()


class UserBehavior(models.Model):
    """Kullanıcı davranış kayıtları - Behavior Tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='behaviors')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='behaviors')
    
    # Davranış türleri
    action_type = models.CharField(max_length=20, choices=[
        ('view', 'Görüntüleme'),
        ('swipe_like', 'Beğenme'),
        ('swipe_dislike', 'Beğenmeme'),
        ('swipe_save', 'Kaydetme'),
        ('detail_view', 'Detay Görüntüleme'),
        ('visit', 'Ziyaret'),
        ('review', 'Yorum'),
    ])
    
    # Bağlamsal bilgiler
    context = models.JSONField(default=dict, blank=True, help_text="Bağlam: {'time_of_day': '17:00', 'day_of_week': 'monday', 'device': 'mobile'}")
    filters_used = models.JSONField(default=list, blank=True, help_text="Kullanılan filtreler: ['category:kafe', 'price:$$']")
    session_id = models.CharField(max_length=100, blank=True, help_text="Oturum ID")
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'action_type']),
            models.Index(fields=['place', 'action_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} - {self.action_type}"


class SocialMatching(models.Model):
    """Sosyal eşleştirme - Arkadaşların beğendiği mekanlar"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='social_matches')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='social_matches')
    
    # Arkadaşların etkileşimleri
    friend_likes = models.IntegerField(default=0, help_text="Kaç arkadaş beğendi")
    friend_visits = models.IntegerField(default=0, help_text="Kaç arkadaş ziyaret etti")
    friend_reviews = models.IntegerField(default=0, help_text="Kaç arkadaş yorum yaptı")
    
    # Eşleşme skoru
    match_score = models.FloatField(default=0.0, help_text="Sosyal eşleşme skoru (0-1)")
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'place']
        ordering = ['-match_score']
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} (Score: {self.match_score})"


class PlaceGraph(models.Model):
    """Local Discovery Graph - Mekanlar arası ilişkiler"""
    from_place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='outgoing_connections')
    to_place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='incoming_connections')
    
    # İlişki türleri
    relationship_type = models.CharField(max_length=20, choices=[
        ('similar', 'Benzer'),
        ('nearby', 'Yakın'),
        ('same_category', 'Aynı Kategori'),
        ('same_atmosphere', 'Aynı Atmosfer'),
        ('user_co_visit', 'Birlikte Ziyaret Edilen'),
        ('user_co_like', 'Birlikte Beğenilen'),
    ])
    
    # İlişki gücü (0-1)
    strength = models.FloatField(default=0.5, help_text="İlişki gücü (0-1)")
    
    # İstatistikler
    co_visit_count = models.IntegerField(default=0, help_text="Birlikte ziyaret sayısı")
    co_like_count = models.IntegerField(default=0, help_text="Birlikte beğenilme sayısı")
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['from_place', 'to_place', 'relationship_type']
        ordering = ['-strength']
    
    def __str__(self):
        return f"{self.from_place.name} -> {self.to_place.name} ({self.relationship_type})"

