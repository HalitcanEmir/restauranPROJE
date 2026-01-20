from django.urls import path
from . import api_views, group_planning_api

app_name = 'social_api'

urlpatterns = [
    path('friends/feed/', api_views.FriendsFeedAPIView, name='friends_feed'),
    path('friends/request/', api_views.FriendRequestAPIView, name='friend_request'),
    path('friends/respond/', api_views.FriendRespondAPIView, name='friend_respond'),
    path('leaderboard/', api_views.LeaderboardAPIView.as_view(), name='leaderboard'),
    # Grup planlama endpoints
    path('plans/', group_planning_api.group_plans_api, name='group_plans'),
    path('plans/<int:plan_id>/', group_planning_api.group_plan_detail_api, name='group_plan_detail'),
    path('plans/<int:plan_id>/invite/', group_planning_api.invite_participants_api, name='invite_participants'),
    path('plans/<int:plan_id>/respond/', group_planning_api.respond_to_invitation_api, name='respond_invitation'),
    path('plans/<int:plan_id>/suggest-place/', group_planning_api.suggest_place_api, name='suggest_place'),
    path('plans/<int:plan_id>/vote/', group_planning_api.vote_place_api, name='vote_place'),
    path('plans/<int:plan_id>/finalize/', group_planning_api.finalize_plan_api, name='finalize_plan'),
    path('plans/<int:plan_id>/export-ical/', group_planning_api.export_plan_ical, name='export_plan_ical'),
    path('friends/for-invite/', group_planning_api.get_friends_for_invite_api, name='friends_for_invite'),
]
