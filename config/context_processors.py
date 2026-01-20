"""
Context processors for templates
"""
from django.conf import settings


def google_maps_api_key(request):
    """
    Google Maps API key'i template'lere ekler
    """
    return {
        'GOOGLE_MAPS_API_KEY': getattr(settings, 'GOOGLE_MAPS_API_KEY', 'AIzaSyDummyKey')
    }
