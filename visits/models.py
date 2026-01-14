from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from accounts.models import User
from places.models import Place


class Visit(models.Model):
    """Ziyaret/Değerlendirme Modeli"""
    SENTIMENT_CHOICES = [
        ('excellent', '😍 Bayıldım'),
        ('good', '🙂 İyi'),
        ('meh', '😐 Eh işte'),
        ('bad', '😕 Beğenmedim'),
        ('terrible', '🤮 Berbattı'),
    ]
    
    WITH_WHOM_CHOICES = [
        ('sevgili', 'Sevgiliyle'),
        ('aile', 'Aileyle'),
        ('dost', 'Arkadaşlarla'),
        ('tek', 'Tek başıma'),
        ('is', 'İş'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='visits')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='visits')
    visited_at = models.DateTimeField(auto_now_add=True)
    
    # Yeni kart tabanlı alanlar
    sentiment = models.CharField(
        max_length=20, 
        choices=SENTIMENT_CHOICES, 
        blank=True, 
        null=True,
        help_text="Genel izlenim"
    )
    tags = models.JSONField(
        default=list, 
        blank=True,
        help_text="Mekan tipi: butik, modern, mahalle, vs."
    )
    suitable_for = models.JSONField(
        default=list, 
        blank=True,
        help_text="Kiminle gidilir: sevgili, arkadaş, aile, vs."
    )
    atmosphere = models.JSONField(
        default=list, 
        blank=True,
        help_text="Ortam: sessiz, müzikli, kalabalık, vs."
    )
    
    # Eski alanlar (backward compatibility)
    with_whom = models.CharField(max_length=20, choices=WITH_WHOM_CHOICES, blank=True, null=True)
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        blank=True,
        null=True,
        help_text="1-5 arası puan (opsiyonel)"
    )
    comment = models.TextField(blank=True)
    mood_tags = models.JSONField(default=list, blank=True, help_text="Eski mood tags (deprecated)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-visited_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'place'], name='unique_user_place_visit')
        ]  # Bir kullanıcı bir mekana sadece bir kez değerlendirme yapabilir
    
    def __str__(self):
        rating_str = f"({self.rating}/5)" if self.rating else ""
        return f"{self.user.username} - {self.place.name} {rating_str}"

