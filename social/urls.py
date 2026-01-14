from django.urls import path
from . import views

app_name = 'social'

urlpatterns = [
    path('feed/', views.friends_feed, name='friends_feed'),
    path('', views.friends_list, name='friends_list'),
    path('requests/', views.friend_requests, name='friend_requests'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
]
