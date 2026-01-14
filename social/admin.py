from django.contrib import admin
from .models import Friendship, UserScore


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ['requester', 'receiver', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['requester__username', 'receiver__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UserScore)
class UserScoreAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_points', 'city', 'updated_at']
    list_filter = ['city', 'updated_at']
    search_fields = ['user__username', 'city']
    readonly_fields = ['updated_at']
    ordering = ['-total_points']
