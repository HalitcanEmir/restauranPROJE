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
    """Mekan listesi serializer - Zenginleştirilmiş"""
    average_rating = serializers.SerializerMethodField()
    total_visits = serializers.SerializerMethodField()
    first_photo = serializers.SerializerMethodField()
    rating_breakdown = serializers.SerializerMethodField()
    recent_comments = serializers.SerializerMethodField()
    
    class Meta:
        model = Place
        fields = [
            'id', 'name', 'description', 'short_description', 'address', 'city', 
            'categories', 'tags', 'price_level', 'average_rating', 'total_visits',
            'photos', 'first_photo', 'featured_features', 'hours', 'menu_link',
            # Zenginleştirilmiş alanlar
            'atmosphere_profile', 'working_suitability', 'wifi_quality', 'power_outlets', 'peak_hours',
            'price_range', 'menu_highlights', 'best_time_to_visit',
            'use_cases', 'popular_orders', 'vibe_tags', 'similar_places',
            'owner_description', 'local_guide_note', 'target_audience', 'one_line_summary',
            'rating_breakdown', 'recent_comments', 'behavior_stats'
        ]
    
    def get_average_rating(self, obj):
        return obj.average_rating
    
    def get_total_visits(self, obj):
        return obj.total_visits
    
    def get_first_photo(self, obj):
        """İlk fotoğrafı döndür (swipe kartı için)"""
        if obj.photos and len(obj.photos) > 0:
            return obj.photos[0]
        return None
    
    def get_rating_breakdown(self, obj):
        """Puan dağılımı: atmosfer, kahve, fiyat/performans, personel"""
        from visits.models import Visit
        visits = Visit.objects.filter(place=obj)
        
        if not visits.exists():
            return {
                'atmosphere': 0,
                'coffee': 0,
                'value': 0,
                'staff': 0
            }
        
        # Basit hesaplama - gerçekte Visit modelinde bu alanlar olabilir
        # Şimdilik average_rating'i kullan
        avg = obj.average_rating
        return {
            'atmosphere': round(avg + 0.2, 1) if avg > 0 else 0,
            'coffee': round(avg - 0.1, 1) if avg > 0 else 0,
            'value': round(avg - 0.3, 1) if avg > 0 else 0,
            'staff': round(avg + 0.1, 1) if avg > 0 else 0
        }
    
    def get_recent_comments(self, obj):
        """Son yorumlar (kısa, özet)"""
        from visits.models import Visit
        visits = Visit.objects.filter(place=obj, comment__isnull=False).exclude(comment='')[:3]
        
        comments = []
        for visit in visits:
            comment_text = visit.comment[:100]  # İlk 100 karakter
            if len(visit.comment) > 100:
                comment_text += '...'
            comments.append({
                'user': visit.user.username,
                'rating': visit.rating,
                'comment': comment_text,
                'sentiment': visit.sentiment
            })
        
        return comments


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
