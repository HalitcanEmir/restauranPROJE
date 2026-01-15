"""
MongoDB Connection Helper
"""
from pymongo import MongoClient
from django.conf import settings

_mongo_client = None

def get_mongodb_client():
    """
    MongoDB client singleton
    """
    global _mongo_client
    
    if _mongo_client is None:
        try:
            mongodb_settings = getattr(settings, 'MONGODB_SETTINGS', {})
            uri = mongodb_settings.get('uri', '')
            
            if not uri:
                raise ValueError("MongoDB URI not configured in settings")
            
            # PyMongo 4.x için TLS/SSL ayarları
            # tlsAllowInvalidCertificates=True ekle (development için)
            # Production'da bu parametreyi kaldırın ve gerçek sertifikaları kullanın
            _mongo_client = MongoClient(
                uri,
                tlsAllowInvalidCertificates=True  # Development için
            )
            
            # Bağlantıyı test et
            _mongo_client.admin.command('ping')
            print("✓ MongoDB bağlantısı başarılı!")
            
        except Exception as e:
            print(f"✗ MongoDB bağlantı hatası: {e}")
            raise
    
    return _mongo_client


def get_mongodb_database():
    """
    MongoDB database objesi döner
    """
    client = get_mongodb_client()
    mongodb_settings = getattr(settings, 'MONGODB_SETTINGS', {})
    db_name = mongodb_settings.get('database', 'btkdb')
    return client[db_name]


def test_mongodb_connection():
    """
    MongoDB bağlantısını test eder
    """
    try:
        db = get_mongodb_database()
        # Test collection'ı listele
        collections = db.list_collection_names()
        print(f"✓ MongoDB bağlantısı başarılı! Database: {db.name}")
        print(f"  Mevcut collections: {collections}")
        return True
    except Exception as e:
        print(f"✗ MongoDB bağlantı hatası: {e}")
        return False
