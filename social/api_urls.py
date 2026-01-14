from django.urls import path
from . import api_views

app_name = 'social_api'

urlpatterns = [
    path('friends/feed/', api_views.FriendsFeedAPIView, name='friends_feed'),
    path('friends/request/', api_views.FriendRequestAPIView, name='friend_request'),
    path('friends/respond/', api_views.FriendRespondAPIView, name='friend_respond'),
    path('leaderboard/', api_views.LeaderboardAPIView.as_view(), name='leaderboard'),
]
