from django.urls import path
from . import views

app_name = 'social'

urlpatterns = [
    path('feed/', views.friends_feed, name='friends_feed'),
    path('feed/activity/', views.friends_activity, name='friends_activity'),
    path('', views.friends_list, name='friends_list'),
    path('requests/', views.friend_requests, name='friend_requests'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    # Grup planlama
    path('plans/', views.group_plans, name='group_plans'),
    path('plans/create/', views.create_group_plan, name='create_group_plan'),
    path('plans/<int:plan_id>/', views.group_plan_detail, name='group_plan_detail'),
]
