# MongoDB Atlas Bağlantı Kurulumu

## 🔧 Gereksinimler

MongoDB Atlas bağlantısı için gerekli paketler yüklendi:
- `pymongo==4.16.0`
- `dnspython==2.8.0`

## 📝 Bağlantı Bilgileri

Connection String:
```
mongodb://atlas-sql-688228f7978bec551476ca2b-k4jqir.a.query.mongodb.net/btkdb?ssl=true&authSource=admin
```

## 🔐 Kullanıcı Adı ve Şifre Ayarlama

MongoDB Atlas'ta kullanıcı adı: **halitcanemir06**

Şifreyi environment variable olarak ayarlayın:

### Linux/Mac:
```bash
export MONGODB_USERNAME="halitcanemir06"
export MONGODB_PASSWORD="sifreniz"
```

### Windows:
```cmd
set MONGODB_USERNAME=halitcanemir06
set MONGODB_PASSWORD=sifreniz
```

### Hızlı Test:
```bash
# Şifreyi ayarlayın
export MONGODB_USERNAME="halitcanemir06"
export MONGODB_PASSWORD="sifreniz"

# Test edin
python manage_mongodb.py test
```

**Not:** Şifreyi MongoDB Atlas'ta "Edit Password" butonundan oluşturduktan sonra buraya girin.

## ✅ Bağlantıyı Test Etme

```bash
python manage_mongodb.py test
```

## 📦 Veri Senkronizasyonu

Django modellerini MongoDB'ye senkronize etmek için:

```bash
# Sadece Place'leri senkronize et
python manage_mongodb.py sync-places

# Sadece User'ları senkronize et
python manage_mongodb.py sync-users

# Sadece Visit'leri senkronize et
python manage_mongodb.py sync-visits

# Sadece Preference'ları senkronize et
python manage_mongodb.py sync-prefs

# Tüm verileri senkronize et
python manage_mongodb.py sync-all
```

## 📊 MongoDB Collections

Senkronizasyon sonrası şu collections oluşur:
- `places` - Mekan bilgileri
- `users` - Kullanıcı bilgileri
- `visits` - Ziyaret kayıtları
- `preferences` - Swipe tercihleri

## 🔍 MongoDB'yi Kullanma

Python kodunda MongoDB'yi kullanmak için:

```python
from config.mongodb import get_mongodb_database

# Database'i al
db = get_mongodb_database()

# Collection'a eriş
places = db['places']

# Veri sorgula
result = places.find_one({'name': 'Moda Brew'})
print(result)
```

## ⚠️ Notlar

1. Django hala SQLite kullanıyor (ORM için)
2. MongoDB sadece veri senkronizasyonu ve analiz için kullanılıyor
3. Production'da environment variable'ları güvenli şekilde saklayın
4. MongoDB connection string'inde username ve password olmadan bağlantı çalışmayabilir
