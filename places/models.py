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

