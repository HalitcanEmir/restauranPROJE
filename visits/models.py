from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from accounts.models import User
from places.models import Place


class Visit(models.Model):
    """Ziyaret/Değerlendirme Modeli"""
    WITH_WHOM_CHOICES = [
        ('sevgili', 'Sevgiliyle'),
        ('aile', 'Aileyle'),
        ('dost', 'Arkadaşlarla'),
        ('tek', 'Tek başıma'),
        ('is', 'İş'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='visits')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='visits')
    visited_at = models.DateTimeField()
    with_whom = models.CharField(max_length=20, choices=WITH_WHOM_CHOICES)
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1-5 arası puan"
    )
    comment = models.TextField(blank=True)
    mood_tags = models.JSONField(default=list, help_text="Örn: ['samimi', 'sessiz']")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-visited_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'place'], name='unique_user_place_visit')
        ]  # Bir kullanıcı bir mekana sadece bir kez değerlendirme yapabilir
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} ({self.rating}/5)"

