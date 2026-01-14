from django.contrib import admin
from .models import Place, PlacePreference


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'price_level', 'average_rating', 'total_visits', 'created_at']
    list_filter = ['city', 'price_level', 'created_at']
    search_fields = ['name', 'description', 'address', 'city']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'total_visits']
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('name', 'description', 'short_description', 'address', 'city')
        }),
        ('Kategoriler ve Etiketler', {
            'fields': ('categories', 'tags', 'price_level')
        }),
        ('Vitrin Bilgileri', {
            'fields': ('photos', 'featured_features', 'hours', 'menu_link')
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
