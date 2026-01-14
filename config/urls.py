"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('places.urls')),
    path('auth/', include('accounts.urls')),
    path('places/', include('places.urls')),
    path('profile/', include(('accounts.urls', 'accounts'), namespace='accounts')),
    path('friends/', include('social.urls')),
    path('api/places/', include('places.api_urls')),
    path('api/users/', include('accounts.api_urls')),
    path('api/social/', include('social.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
