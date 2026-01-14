from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User Model"""
    email = models.EmailField(unique=True)
    
    def __str__(self):
        return self.username


class Profile(models.Model):
    """User Profile Model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    favorite_categories = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    @property
    def get_display_name(self):
        return self.display_name or self.user.username


class UserTasteProfile(models.Model):
    """Kullanıcı Zevk Profili Modeli"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='taste_profile')
    
    # Ağırlıklar (normalize edilmiş, toplamı 1.0)
    category_weights = models.JSONField(default=dict, help_text="Kategori ağırlıkları: {'kafe': 0.35, 'brunch': 0.25}")
    atmosphere_weights = models.JSONField(default=dict, help_text="Atmosfer ağırlıkları: {'estetik': 0.40, 'manzaralı': 0.20}")
    context_weights = models.JSONField(default=dict, help_text="Context ağırlıkları: {'arkadaş': 0.60, 'sevgili': 0.25}")
    
    style_label = models.CharField(max_length=200, blank=True, help_text="Örn: 'Brunch + Kahve + Estetik'")
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user.username}'s Taste Profile: {self.style_label}"

