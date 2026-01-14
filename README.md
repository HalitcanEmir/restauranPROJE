# Sosyal Mekan Keşif Platformu

Kullanıcıların kafe ve restoran seçerken yardım almasını sağlayan ve bu süreci sosyal ve eğlenceli hale getiren bir platform.

## 🎯 Özellikler

### 1. Mekan Keşif
- Şehir, kategori ve mod bazlı mekan keşfi
- Filtreler: "Sevgiliyle", "Aileyle", "Arkadaşlarla", "Tek başıma", "İş"

### 2. Değerlendirme / Yorum
- Mekan ziyaretini kaydetme
- Kiminle gidildiği bilgisi
- 1-5 arası puanlama
- Yorum yazma
- Ortam tag'leri ekleme (samimi, butik, sessiz, vs.)

### 3. Profil
- Gittiği mekanlar
- Yazdığı yorumlar
- Şehir bilgisi
- Favori kategoriler
- Arkadaş listesi

### 4. Sosyal Sistem
- Arkadaş ekleme / kabul etme
- Arkadaş feed'i
- Liderlik tablosu (puan bazlı)

### 5. Öneri Motoru (V2'de ML)
- Benzer kullanıcıların beğenilerine göre öneri
- Mod bazlı öneri
- İlk aşamada basit kural tabanlı

## 🚀 Kurulum

### Gereksinimler
- Python 3.8+
- PostgreSQL (önerilir) veya SQLite
- pip

### Adımlar

1. **Projeyi klonlayın veya indirin**

2. **Virtual environment oluşturun:**
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. **Bağımlılıkları yükleyin:**
```bash
pip install -r requirements.txt
```

4. **Veritabanı ayarlarını yapın:**

`config/settings.py` dosyasında veritabanı ayarlarını düzenleyin. SQLite kullanmak için değişiklik yapmanıza gerek yok.

PostgreSQL kullanmak için:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

5. **Migration'ları çalıştırın:**
```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Superuser oluşturun:**
```bash
python manage.py createsuperuser
```

7. **Sunucuyu başlatın:**
```bash
python manage.py runserver
```

Tarayıcınızda `http://127.0.0.1:8000` adresine gidin.

## 📑 Sayfa Listesi

| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Ana sayfa | `/` | Mod seçimi + giriş yönlendirme |
| Kayıt | `/auth/register/` | Kullanıcı oluşturma |
| Giriş | `/auth/login/` | Login ekranı |
| Keşfet | `/discover/` | Mekan listesi + filtre |
| Mekan Detay | `/places/<id>/` | Yorumlar + puanlar |
| Değerlendirme Ekle | `/places/<id>/review/` | Form |
| Profil | `/profile/<username>/` | Ziyaretler + yorumlar |
| Profil Düzenle | `/profile/edit/` | Şehir, bio, foto |
| Arkadaş feed | `/friends/feed/` | Son aktiviteler |
| Arkadaşlar | `/friends/` | Arkadaş listesi |
| İstekler | `/friends/requests/` | İstek gönder/kabul |
| Liderlik | `/leaderboard/` | Şehir bazlı puan sıralaması |

## 🌐 API Endpoints

### Places API
- `GET /api/places/` - Mekan listesi (filtreler: city, category, mode, search)
- `GET /api/places/<id>/` - Mekan detayı
- `POST /api/places/<id>/review/` - Değerlendirme ekle

### Accounts API
- `GET /api/users/<username>/` - Kullanıcı profili

### Social API
- `GET /api/friends/feed/` - Arkadaş feed'i
- `POST /api/friends/request/` - Arkadaşlık isteği gönder
- `POST /api/friends/respond/` - Arkadaşlık isteğine yanıt ver
- `GET /api/leaderboard/` - Liderlik tablosu

## 🗃 Veri Modelleri

### User + Profile
- `display_name` - Görünen ad
- `city` - Şehir
- `bio` - Biyografi
- `avatar` - Profil fotoğrafı
- `favorite_categories` - Favori kategoriler

### Place (Mekan)
- `name` - Mekan adı
- `description` - Açıklama
- `address` - Adres
- `city` - Şehir
- `categories` - Kategoriler (JSON)
- `tags` - Etiketler (JSON)
- `price_level` - Fiyat seviyesi (₺, ₺₺, ₺₺₺)

### Visit (Ziyaret)
- `user` - Kullanıcı
- `place` - Mekan
- `visited_at` - Ziyaret tarihi
- `with_whom` - Kiminle (enum)
- `rating` - Puan (1-5)
- `comment` - Yorum
- `mood_tags` - Ortam etiketleri (JSON)

### Social
- `Friendship` - Arkadaşlık (pending, accepted, rejected)
- `UserScore` - Liderlik tablosu için puan

## 🛠 Teknoloji Stack

- **Framework:** Django 4.2
- **Database:** PostgreSQL (önerilir) / SQLite
- **API:** Django REST Framework
- **Frontend:** Django Templates + Bootstrap 5
- **Authentication:** Django Auth

## 📝 Notlar

- JSON alanları için form girişlerinde JSON formatı kullanın (örn: `["samimi", "sessiz"]`)
- Admin panelinden mekan ve kullanıcı verilerini yönetebilirsiniz: `/admin/`
- Her ziyaret için puan hesaplama: `rating * 10`
- Liderlik tablosu şehir bazlı filtrelenebilir

## 🚧 Gelecek Özellikler (V2)

- ML tabanlı kişiselleştirme
- Mekanların otomatik tag'lenmesi
- Şehir bazlı sosyal keşif
- Gamification özellikleri

## 👥 Geliştirme

Proje modüler yapıda:
- `accounts` - Kullanıcı ve profil yönetimi
- `places` - Mekan yönetimi
- `visits` - Ziyaret ve değerlendirme
- `social` - Arkadaşlık ve liderlik sistemi

Her modül kendi views, models, forms ve API'lerine sahiptir.

## 📄 Lisans

Bu proje eğitim amaçlıdır.
