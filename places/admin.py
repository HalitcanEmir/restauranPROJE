from django.contrib import admin
from .models import Place


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'price_level', 'average_rating', 'total_visits', 'created_at']
    list_filter = ['city', 'price_level', 'created_at']
    search_fields = ['name', 'description', 'address', 'city']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'total_visits']
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('name', 'description', 'address', 'city')
        }),
        ('Kategoriler ve Etiketler', {
            'fields': ('categories', 'tags', 'price_level')
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
