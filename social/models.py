from django.db import models
from accounts.models import User


class Friendship(models.Model):
    """Arkadaşlık Modeli"""
    STATUS_CHOICES = [
        ('pending', 'Beklemede'),
        ('accepted', 'Kabul Edildi'),
        ('rejected', 'Reddedildi'),
    ]
    
    requester = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_friend_requests'
    )
    receiver = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_friend_requests'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['requester', 'receiver'], name='unique_friendship')
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.requester.username} -> {self.receiver.username} ({self.status})"


class UserScore(models.Model):
    """Liderlik Tablosu için Kullanıcı Puanı"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='score')
    total_points = models.IntegerField(default=0)
    city = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-total_points']
    
    def __str__(self):
        return f"{self.user.username} - {self.total_points} puan"
    
    def calculate_score(self):
        """Kullanıcının puanını hesapla"""
        from visits.models import Visit
        visits = Visit.objects.filter(user=self.user)
        # Her ziyaret için puan: rating * 10
        points = sum(visit.rating * 10 for visit in visits)
        self.total_points = points
        self.save()
        return points
