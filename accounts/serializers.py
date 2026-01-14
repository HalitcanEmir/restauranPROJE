from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile
from visits.models import Visit

User = get_user_model()


class VisitSerializer(serializers.ModelSerializer):
    """Ziyaret serializer"""
    place_name = serializers.CharField(source='place.name', read_only=True)
    place_id = serializers.IntegerField(source='place.id', read_only=True)
    
    class Meta:
        model = Visit
        fields = ['id', 'place_id', 'place_name', 'visited_at', 'with_whom', 'rating', 'comment', 'mood_tags']


class ProfileSerializer(serializers.ModelSerializer):
    """Profil serializer"""
    class Meta:
        model = Profile
        fields = ['display_name', 'city', 'bio', 'avatar', 'favorite_categories']


class UserProfileSerializer(serializers.ModelSerializer):
    """Kullanıcı profil serializer"""
    profile = ProfileSerializer(read_only=True)
    visits = VisitSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined', 'profile', 'visits']
