from django.db import models
from django.utils import timezone
from accounts.models import User
from places.models import Place


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


class GroupPlan(models.Model):
    """Grup Planlama - Arkadaşlarla birlikte mekan seçimi"""
    STATUS_CHOICES = [
        ('draft', 'Taslak'),
        ('voting', 'Oylama Aşamasında'),
        ('finalized', 'Kesinleşti'),
        ('cancelled', 'İptal Edildi'),
    ]
    
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_plans')
    title = models.CharField(max_length=200, help_text="Plan başlığı: 'Cumartesi Brunch'")
    description = models.TextField(blank=True, help_text="Plan açıklaması")
    
    # Tarih ve saat
    planned_date = models.DateTimeField(null=True, blank=True, help_text="Planlanan tarih ve saat")
    deadline = models.DateTimeField(null=True, blank=True, help_text="Oylama bitiş tarihi")
    
    # Durum
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Seçilen mekan (oylamadan sonra)
    selected_place = models.ForeignKey(Place, on_delete=models.SET_NULL, null=True, blank=True, related_name='group_plans')
    
    # Takvim entegrasyonu
    calendar_event_id = models.CharField(max_length=200, blank=True, help_text="Google Calendar event ID")
    ical_uid = models.CharField(max_length=200, blank=True, help_text="iCal UID")
    
    # Grup içi hızlı anket soruları (en fazla 3 soru önerilir)
    poll_questions = models.JSONField(
        default=list,
        blank=True,
        help_text="Grup içi oylama soruları listesi (örn: ['Bugün akşam geliyor musun?', 'Kaça kadar kalabilirsin?'])"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['creator', 'status']),
            models.Index(fields=['planned_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.creator.username}"
    
    @property
    def is_voting_active(self):
        """Oylama aktif mi?"""
        if self.status != 'voting':
            return False
        if self.deadline and timezone.now() > self.deadline:
            return False
        return True
    
    @property
    def total_participants(self):
        """Toplam katılımcı sayısı"""
        return self.participants.count()
    
    @property
    def total_votes(self):
        """Toplam oy sayısı"""
        return self.votes.count()
    
    def get_winner_place(self):
        """En çok oy alan mekanı döndürür"""
        from django.db.models import Count
        votes = self.votes.values('place').annotate(
            vote_count=Count('id')
        ).order_by('-vote_count')
        
        if votes:
            winner_place_id = votes[0]['place']
            return Place.objects.get(id=winner_place_id)
        return None


class PlanParticipant(models.Model):
    """Plan katılımcıları"""
    plan = models.ForeignKey(GroupPlan, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plan_participations')
    
    # Katılım durumu
    is_invited = models.BooleanField(default=True)
    has_accepted = models.BooleanField(default=False)
    has_declined = models.BooleanField(default=False)
    
    # Hızlı anket cevapları (soru index -> cevap)
    poll_answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Grup planı içindeki sorulara verilen cevaplar, {'0': 'Evet', '1': '23:00'} gibi"
    )
    
    # Bildirim tercihleri
    notify_on_vote = models.BooleanField(default=True)
    notify_on_finalize = models.BooleanField(default=True)
    
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['plan', 'user']
        ordering = ['-invited_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.title}"


class PlanVote(models.Model):
    """Plan oyları - Her kullanıcı her mekana bir oy verebilir"""
    plan = models.ForeignKey(GroupPlan, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plan_votes')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='plan_votes')
    
    # Oylama türü
    vote_type = models.CharField(
        max_length=20,
        choices=[
            ('yes', 'Evet'),
            ('maybe', 'Belki'),
            ('no', 'Hayır'),
        ],
        default='yes'
    )
    
    # Not (opsiyonel)
    note = models.TextField(blank=True, help_text="Oy notu")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['plan', 'user', 'place']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['plan', 'place']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} ({self.get_vote_type_display()})"


class PlanPlaceOption(models.Model):
    """Plan için önerilen mekan seçenekleri"""
    plan = models.ForeignKey(GroupPlan, on_delete=models.CASCADE, related_name='place_options')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='plan_options')
    suggested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suggested_places')
    
    # Öneri notu
    suggestion_note = models.TextField(blank=True, help_text="Neden bu mekan önerildi?")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['plan', 'place']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.place.name} - {self.plan.title}"
    
    @property
    def vote_count(self):
        """Bu mekana verilen oy sayısı"""
        return self.place.plan_votes.filter(plan=self.plan, vote_type='yes').count()
