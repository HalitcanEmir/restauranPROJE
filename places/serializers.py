from rest_framework import serializers
from .models import Place
from visits.models import Visit


class VisitSerializer(serializers.ModelSerializer):
    """Ziyaret serializer"""
    user = serializers.StringRelatedField()
    user_username = serializers.CharField(source='user.username', read_only=True)
    sentiment_display = serializers.CharField(source='get_sentiment_display', read_only=True)
    
    class Meta:
        model = Visit
        fields = ['id', 'user', 'user_username', 'visited_at', 'sentiment', 'sentiment_display', 
                  'tags', 'suitable_for', 'atmosphere', 'with_whom', 'rating', 'comment', 'mood_tags']


class PlaceSerializer(serializers.ModelSerializer):
    """Mekan listesi serializer"""
    average_rating = serializers.SerializerMethodField()
    total_visits = serializers.SerializerMethodField()
    
    class Meta:
        model = Place
        fields = ['id', 'name', 'description', 'address', 'city', 'categories', 'tags', 
                  'price_level', 'average_rating', 'total_visits']
    
    def get_average_rating(self, obj):
        return obj.average_rating
    
    def get_total_visits(self, obj):
        return obj.total_visits


class PlaceDetailSerializer(serializers.ModelSerializer):
    """Mekan detay serializer"""
    average_rating = serializers.SerializerMethodField()
    total_visits = serializers.SerializerMethodField()
    visits = VisitSerializer(many=True, read_only=True)
    
    class Meta:
        model = Place
        fields = ['id', 'name', 'description', 'address', 'city', 'categories', 'tags',
                  'price_level', 'latitude', 'longitude', 'average_rating', 'total_visits', 'visits']
    
    def get_average_rating(self, obj):
        return obj.average_rating
    
    def get_total_visits(self, obj):
        return obj.total_visits
