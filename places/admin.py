from django.contrib import admin
from .models import Place, PlacePreference, UserBehavior, SocialMatching, PlaceGraph


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'price_level', 'average_rating', 'total_visits', 'created_at']
    list_filter = ['city', 'price_level', 'created_at']
    search_fields = ['name', 'description', 'address', 'city']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'total_visits']
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('name', 'description', 'short_description', 'address', 'city', 'one_line_summary')
        }),
        ('Kategoriler ve Etiketler', {
            'fields': ('categories', 'tags', 'price_level', 'vibe_tags')
        }),
        ('Vitrin Bilgileri', {
            'fields': ('photos', 'featured_features', 'hours', 'menu_link')
        }),
        ('Atmosfer Profili', {
            'fields': ('atmosphere_profile', 'working_suitability', 'wifi_quality', 'power_outlets', 'peak_hours', 'behavior_stats')
        }),
        ('Karar Destekleyici Bilgiler', {
            'fields': ('price_range', 'menu_highlights', 'best_time_to_visit')
        }),
        ('Use Case Mapping', {
            'fields': ('use_cases', 'target_audience')
        }),
        ('Oyunlaştırma', {
            'fields': ('popular_orders', 'similar_places')
        }),
        ('Sosyal Kanıt', {
            'fields': ('owner_description', 'local_guide_note')
        }),
        ('Konum', {
            'fields': ('latitude', 'longitude')
        }),
        ('İstatistikler', {
            'fields': ('average_rating', 'total_visits')
        }),
        ('Tarihler', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PlacePreference)
class PlacePreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'place', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'place__name']
    readonly_fields = ['timestamp', 'updated_at']


@admin.register(UserBehavior)
class UserBehaviorAdmin(admin.ModelAdmin):
    list_display = ['user', 'place', 'action_type', 'timestamp']
    list_filter = ['action_type', 'timestamp']
    search_fields = ['user__username', 'place__name']
    readonly_fields = ['timestamp']


@admin.register(SocialMatching)
class SocialMatchingAdmin(admin.ModelAdmin):
    list_display = ['user', 'place', 'match_score', 'friend_likes', 'updated_at']
    list_filter = ['updated_at']
    search_fields = ['user__username', 'place__name']
    readonly_fields = ['updated_at']


@admin.register(PlaceGraph)
class PlaceGraphAdmin(admin.ModelAdmin):
    list_display = ['from_place', 'to_place', 'relationship_type', 'strength', 'updated_at']
    list_filter = ['relationship_type', 'updated_at']
    search_fields = ['from_place__name', 'to_place__name']
    readonly_fields = ['updated_at']
