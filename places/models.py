from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Place(models.Model):
    """Mekan Modeli"""
    PRICE_LEVEL_CHOICES = [
        ('₺', '₺ - Ucuz'),
        ('₺₺', '₺₺ - Orta'),
        ('₺₺₺', '₺₺₺ - Pahalı'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100)
    categories = models.JSONField(default=list, help_text="Örn: ['sevgili', 'aile', 'dost']")
    tags = models.JSONField(default=list, help_text="Örn: ['samimi', 'sessiz', 'butik']")
    price_level = models.CharField(max_length=3, choices=PRICE_LEVEL_CHOICES, default='₺₺')
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

