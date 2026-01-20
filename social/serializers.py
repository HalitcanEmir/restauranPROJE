from rest_framework import serializers
from visits.models import Visit
from accounts.models import User
from places.models import Place
from places.serializers import PlaceSerializer
from .models import Friendship, UserScore, GroupPlan, PlanParticipant, PlanVote, PlanPlaceOption


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


class PlanParticipantSerializer(serializers.ModelSerializer):
    """Plan katılımcı serializer"""
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = PlanParticipant
        fields = ['id', 'user_id', 'username', 'is_invited', 'has_accepted', 
                  'has_declined', 'invited_at', 'responded_at']


class PlanVoteSerializer(serializers.ModelSerializer):
    """Plan oy serializer"""
    username = serializers.CharField(source='user.username', read_only=True)
    place_name = serializers.CharField(source='place.name', read_only=True)
    place_data = PlaceSerializer(source='place', read_only=True)
    
    class Meta:
        model = PlanVote
        fields = ['id', 'username', 'place', 'place_name', 'place_data', 
                  'vote_type', 'note', 'created_at']


class PlanPlaceOptionSerializer(serializers.ModelSerializer):
    """Plan mekan seçeneği serializer"""
    place_data = PlaceSerializer(source='place', read_only=True)
    suggested_by_username = serializers.CharField(source='suggested_by.username', read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PlanPlaceOption
        fields = ['id', 'place', 'place_data', 'suggested_by', 'suggested_by_username',
                  'suggestion_note', 'vote_count', 'created_at']


class GroupPlanSerializer(serializers.ModelSerializer):
    """Grup plan serializer"""
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    selected_place_data = PlaceSerializer(source='selected_place', read_only=True)
    participants = PlanParticipantSerializer(many=True, read_only=True)
    votes = PlanVoteSerializer(many=True, read_only=True)
    place_options = PlanPlaceOptionSerializer(many=True, read_only=True)
    total_participants = serializers.IntegerField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    is_voting_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = GroupPlan
        fields = [
            'id', 'creator', 'creator_username', 'title', 'description',
            'planned_date', 'deadline', 'status', 'selected_place', 'selected_place_data',
            'calendar_event_id', 'ical_uid', 'created_at', 'updated_at',
            'participants', 'votes', 'place_options', 'total_participants',
            'total_votes', 'is_voting_active'
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at']


class GroupPlanListSerializer(serializers.ModelSerializer):
    """Grup plan liste serializer (kısa versiyon)"""
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    selected_place_name = serializers.CharField(source='selected_place.name', read_only=True)
    total_participants = serializers.IntegerField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = GroupPlan
        fields = [
            'id', 'title', 'description', 'planned_date', 'deadline',
            'status', 'selected_place_name', 'creator_username',
            'total_participants', 'total_votes', 'created_at'
        ]
