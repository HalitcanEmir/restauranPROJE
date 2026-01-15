#!/usr/bin/env python
"""
MongoDB Management Script
Kullanım:
    python manage_mongodb.py test          # Bağlantıyı test et
    python manage_mongodb.py sync-places  # Place'leri senkronize et
    python manage_mongodb.py sync-all      # Tüm verileri senkronize et
"""
import os
import sys
import django

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from config.mongodb import test_mongodb_connection
from places.mongodb_management import (
    sync_places_to_mongodb,
    sync_users_to_mongodb,
    sync_visits_to_mongodb,
    sync_preferences_to_mongodb
)


def main():
    if len(sys.argv) < 2:
        print("Kullanım:")
        print("  python manage_mongodb.py test          # Bağlantıyı test et")
        print("  python manage_mongodb.py sync-places   # Place'leri senkronize et")
        print("  python manage_mongodb.py sync-users    # User'ları senkronize et")
        print("  python manage_mongodb.py sync-visits   # Visit'leri senkronize et")
        print("  python manage_mongodb.py sync-prefs    # Preference'ları senkronize et")
        print("  python manage_mongodb.py sync-all      # Tüm verileri senkronize et")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'test':
        print("MongoDB bağlantısı test ediliyor...")
        if test_mongodb_connection():
            print("✓ Bağlantı başarılı!")
        else:
            print("✗ Bağlantı başarısız!")
            sys.exit(1)
    
    elif command == 'sync-places':
        print("Place'ler MongoDB'ye senkronize ediliyor...")
        sync_places_to_mongodb()
    
    elif command == 'sync-users':
        print("User'lar MongoDB'ye senkronize ediliyor...")
        sync_users_to_mongodb()
    
    elif command == 'sync-visits':
        print("Visit'ler MongoDB'ye senkronize ediliyor...")
        sync_visits_to_mongodb()
    
    elif command == 'sync-prefs':
        print("Preference'lar MongoDB'ye senkronize ediliyor...")
        sync_preferences_to_mongodb()
    
    elif command == 'sync-all':
        print("Tüm veriler MongoDB'ye senkronize ediliyor...")
        sync_places_to_mongodb()
        sync_users_to_mongodb()
        sync_visits_to_mongodb()
        sync_preferences_to_mongodb()
        print("\n✓ Tüm senkronizasyon tamamlandı!")
    
    else:
        print(f"Bilinmeyen komut: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
