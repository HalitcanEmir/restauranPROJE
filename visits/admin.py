from django.contrib import admin
from .models import Visit


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ['user', 'place', 'rating', 'with_whom', 'visited_at', 'created_at']
    list_filter = ['rating', 'with_whom', 'visited_at', 'created_at']
    search_fields = ['user__username', 'place__name', 'comment']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'visited_at'
    
    fieldsets = (
        ('Kullanıcı ve Mekan', {
            'fields': ('user', 'place')
        }),
        ('Ziyaret Detayları', {
            'fields': ('visited_at', 'with_whom', 'rating', 'comment', 'mood_tags')
        }),
        ('Tarihler', {
            'fields': ('created_at', 'updated_at')
        }),
    )
