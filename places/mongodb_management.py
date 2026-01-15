"""
MongoDB Management Commands
"""
from config.mongodb import get_mongodb_database, test_mongodb_connection
from places.models import Place
from accounts.models import User
from visits.models import Visit
from places.models import PlacePreference
import json


def sync_places_to_mongodb():
    """
    Django Place modelini MongoDB'ye senkronize eder
    """
    db = get_mongodb_database()
    places_collection = db['places']
    
    places = Place.objects.all()
    synced_count = 0
    
    for place in places:
        place_doc = {
            'django_id': place.id,
            'name': place.name,
            'description': place.description or '',
            'short_description': place.short_description or '',
            'address': place.address or '',
            'city': place.city or '',
            'latitude': float(place.latitude) if place.latitude else None,
            'longitude': float(place.longitude) if place.longitude else None,
            'categories': place.categories or [],
            'tags': place.tags or [],
            'price_level': place.price_level or '',
            'photos': place.photos or [],
            'hours': place.hours or {},
            'menu_link': place.menu_link or '',
            'featured_features': place.featured_features or [],
            'average_rating': float(place.average_rating) if place.average_rating else 0.0,
            'total_visits': place.total_visits or 0,
            'created_at': place.created_at.isoformat() if hasattr(place, 'created_at') else None,
        }
        
        # Upsert (varsa güncelle, yoksa ekle)
        places_collection.update_one(
            {'django_id': place.id},
            {'$set': place_doc},
            upsert=True
        )
        synced_count += 1
    
    print(f"✓ {synced_count} mekan MongoDB'ye senkronize edildi")
    return synced_count


def sync_users_to_mongodb():
    """
    Django User modelini MongoDB'ye senkronize eder
    """
    db = get_mongodb_database()
    users_collection = db['users']
    
    users = User.objects.all()
    synced_count = 0
    
    for user in users:
        user_doc = {
            'django_id': user.id,
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'is_active': user.is_active,
        }
        
        # Profile bilgileri varsa ekle
        if hasattr(user, 'profile'):
            profile = user.profile
            user_doc['profile'] = {
                'display_name': profile.display_name or '',
                'city': profile.city or '',
                'bio': profile.bio or '',
                'favorite_categories': profile.favorite_categories or [],
            }
        
        users_collection.update_one(
            {'django_id': user.id},
            {'$set': user_doc},
            upsert=True
        )
        synced_count += 1
    
    print(f"✓ {synced_count} kullanıcı MongoDB'ye senkronize edildi")
    return synced_count


def sync_visits_to_mongodb():
    """
    Django Visit modelini MongoDB'ye senkronize eder
    """
    db = get_mongodb_database()
    visits_collection = db['visits']
    
    visits = Visit.objects.all()
    synced_count = 0
    
    for visit in visits:
        visit_doc = {
            'django_id': visit.id,
            'user_id': visit.user.id,
            'place_id': visit.place.id,
            'rating': visit.rating or 0,
            'comment': visit.comment or '',
            'visited_at': visit.visited_at.isoformat() if visit.visited_at else None,
            'sentiment': visit.sentiment or '',
            'tags': visit.tags or [],
            'suitable_for': visit.suitable_for or [],
            'atmosphere': visit.atmosphere or [],
        }
        
        visits_collection.update_one(
            {'django_id': visit.id},
            {'$set': visit_doc},
            upsert=True
        )
        synced_count += 1
    
    print(f"✓ {synced_count} ziyaret MongoDB'ye senkronize edildi")
    return synced_count


def sync_preferences_to_mongodb():
    """
    Django PlacePreference modelini MongoDB'ye senkronize eder
    """
    db = get_mongodb_database()
    preferences_collection = db['preferences']
    
    preferences = PlacePreference.objects.all()
    synced_count = 0
    
    for pref in preferences:
        pref_doc = {
            'django_id': pref.id,
            'user_id': pref.user.id,
            'place_id': pref.place.id,
            'action': pref.action,
            'created_at': pref.created_at.isoformat() if pref.created_at else None,
        }
        
        preferences_collection.update_one(
            {'django_id': pref.id},
            {'$set': pref_doc},
            upsert=True
        )
        synced_count += 1
    
    print(f"✓ {synced_count} tercih MongoDB'ye senkronize edildi")
    return synced_count
