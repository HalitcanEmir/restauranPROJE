from rest_framework import serializers
from visits.models import Visit
from accounts.models import User
from .models import Friendship, UserScore


class VisitSerializer(serializers.ModelSerializer):
    """Ziyaret serializer"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    place_name = serializers.CharField(source='place.name', read_only=True)
    place_id = serializers.IntegerField(source='place.id', read_only=True)
    
    class Meta:
        model = Visit
        fields = ['id', 'user_username', 'place_id', 'place_name', 'visited_at', 
                  'with_whom', 'rating', 'comment', 'mood_tags']


class FriendshipSerializer(serializers.ModelSerializer):
    """Arkadaşlık serializer"""
    requester_username = serializers.CharField(source='requester.username', read_only=True)
    receiver_username = serializers.CharField(source='receiver.username', read_only=True)
    
    class Meta:
        model = Friendship
        fields = ['id', 'requester_username', 'receiver_username', 'status', 'created_at']


class UserScoreSerializer(serializers.ModelSerializer):
    """Kullanıcı puan serializer"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserScore
        fields = ['username', 'total_points', 'city', 'updated_at']
