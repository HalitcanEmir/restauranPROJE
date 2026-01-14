from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Profile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'is_staff', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'date_joined']


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'city', 'created_at']
    list_filter = ['city', 'created_at']
    search_fields = ['user__username', 'display_name', 'city']
    readonly_fields = ['created_at', 'updated_at']
