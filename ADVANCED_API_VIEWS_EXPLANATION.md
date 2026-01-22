# Advanced API Views - Detaylı Açıklama

## 📚 Genel Bakış

Bu dosya, restoran öneri sisteminin **gelişmiş özelliklerini** sağlayan API endpoint'lerini içerir. 
3 ana özellik sunar:

1. **Sosyal Eşleştirme** (Social Matching)
2. **Mekan Grafiği** (Place Graph) 
3. **Bağlamsal Öneriler** (Contextual Recommendations)

---

## 1️⃣ Sosyal Eşleştirme (Social Matching)

### 🎯 Amaç
Arkadaşlarının beğendiği/ziyaret ettiği mekanları gösterir. 
**"Arkadaşların burayı beğenmiş, sen de beğenebilirsin"** mantığı.

### 📍 Endpoint 1: `get_social_matches`

**URL:** `GET /api/places/social-matches/`

**Ne Yapar:**
- Kullanıcının arkadaşlarının beğendiği/ziyaret ettiği mekanları getirir
- Her mekan için bir "sosyal eşleşme skoru" hesaplar
- Skorlarına göre sıralar (en yüksek skor üstte)

**Nasıl Çalışır:**
```python
# 1. Kullanıcının arkadaşlarını bul
friends = Friendship.objects.filter(user=user, status='accepted')

# 2. Arkadaşların beğendiği mekanları bul
matches = SocialMatching.objects.filter(user=user, match_score__gt=0)

# 3. Skorlarına göre sırala ve döndür
matches.order_by('-match_score')[:10]
```

**Örnek Kullanım:**
```javascript
// Frontend'den çağrı
fetch('/api/places/social-matches/?limit=10')
  .then(res => res.json())
  .then(data => {
    // data.places: Arkadaşların beğendiği mekanlar
    // Her mekan için:
    // - place.social_match.score: Eşleşme skoru (0-1)
    // - place.social_match.friend_likes: Kaç arkadaş beğenmiş
    // - place.social_match.friend_visits: Kaç arkadaş ziyaret etmiş
  });
```

**Dönen Veri Yapısı:**
```json
{
  "success": true,
  "places": [
    {
      "id": 1,
      "name": "Starbucks Moda",
      "social_match": {
        "score": 0.85,
        "friend_likes": 5,
        "friend_visits": 3,
        "friend_reviews": 2
      }
    }
  ],
  "count": 10
}
```

---

### 📍 Endpoint 2: `calculate_social_match`

**URL:** `POST /api/places/social-match/calculate/`

**Ne Yapar:**
- Belirli bir mekan için sosyal eşleşme skorunu hesaplar
- Arkadaşların bu mekanla etkileşimlerini analiz eder

**Request Body:**
```json
{
  "place_id": 123
}
```

**Nasıl Çalışır:**
```python
# 1. Mekanı bul
place = Place.objects.get(id=place_id)

# 2. Arkadaşların etkileşimlerini say
friend_likes = PlacePreference.objects.filter(
    user__in=friends, 
    place=place, 
    action='like'
).count()

# 3. Skor hesapla (0-1 arası)
match_score = (friend_likes * 0.5 + friend_visits * 0.3 + friend_reviews * 0.2) / total_friends
```

**Örnek Kullanım:**
```javascript
// Bir mekanın detay sayfasında
fetch('/api/places/social-match/calculate/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({place_id: 123})
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log(`Sosyal eşleşme skoru: ${data.match_score}`);
    console.log(`${data.friend_likes} arkadaşın beğenmiş`);
  }
});
```

---

## 2️⃣ Mekan Grafiği (Place Graph)

### 🎯 Amaç
Mekanlar arası ilişkileri modelleyerek **"Bu mekanı beğendin, şunları da beğenebilirsin"** 
önerileri yapmak.

### 📍 Endpoint 1: `get_place_graph`

**URL:** `GET /api/places/graph/<place_id>/`

**Ne Yapar:**
- Bir mekanın ilişkili mekanlarını getirir
- İlişki türlerini gösterir (benzer, yakın, aynı kategori, vb.)

**İlişki Türleri:**
- `similar`: Benzer mekanlar
- `nearby`: Yakın mekanlar
- `same_category`: Aynı kategori
- `same_atmosphere`: Aynı atmosfer
- `user_co_visit`: Birlikte ziyaret edilen
- `user_co_like`: Birlikte beğenilen

**Nasıl Çalışır:**
```python
# 1. Mekanı bul
place = Place.objects.get(id=place_id)

# 2. Bu mekandan diğer mekanlara olan bağlantıları getir
connections = PlaceGraph.objects.filter(
    from_place=place
).order_by('-strength')[:10]

# 3. Her bağlantı için:
# - Hangi mekana bağlı (to_place)
# - İlişki türü (relationship_type)
# - İlişki gücü (strength: 0-1)
```

**Örnek Kullanım:**
```javascript
// Bir mekanın detay sayfasında "Benzer Mekanlar" bölümü için
fetch('/api/places/graph/123/')
  .then(res => res.json())
  .then(data => {
    // data.connections: İlişkili mekanlar
    data.connections.forEach(conn => {
      console.log(`${conn.place.name} - ${conn.relationship_type} (${conn.strength})`);
    });
  });
```

**Dönen Veri Yapısı:**
```json
{
  "success": true,
  "place_name": "Starbucks Moda",
  "connections": [
    {
      "place": {
        "id": 2,
        "name": "Petra Coffee"
      },
      "relationship_type": "similar",
      "strength": 0.8,
      "co_like_count": 15,
      "co_visit_count": 8
    }
  ],
  "count": 10
}
```

---

### 📍 Endpoint 2: `build_graph_for_place`

**URL:** `POST /api/places/graph/<place_id>/build/`

**Ne Yapar:**
- Bir mekan için graph ilişkilerini oluşturur veya günceller
- Bu endpoint'i manuel olarak çağırabilirsin (genelde otomatik çalışır)

**Nasıl Çalışır:**
```python
# 1. Benzer mekanları bul (similar_places field'ından)
if place.similar_places:
    for similar_name in place.similar_places:
        similar_place = Place.objects.get(name=similar_name)
        PlaceGraph.objects.create(
            from_place=place,
            to_place=similar_place,
            relationship_type='similar',
            strength=0.8
        )

# 2. Aynı kategorideki mekanları bul
same_category = Place.objects.filter(
    categories__overlap=place.categories
)

# 3. Birlikte beğenilen mekanları bul
# (Aynı kullanıcıların beğendiği mekanlar)
```

**Örnek Kullanım:**
```javascript
// Admin panelinde veya yeni mekan eklendiğinde
fetch('/api/places/graph/123/build/', {
  method: 'POST'
})
.then(res => res.json())
.then(data => {
  console.log(data.message); // "Starbucks Moda için graph ilişkileri oluşturuldu"
});
```

---

## 3️⃣ Bağlamsal Öneriler (Contextual Recommendations)

### 🎯 Amaç
Kullanıcının **mevcut durumuna göre** öneriler yapmak:
- **Zaman:** Sabah mı, öğle mi, akşam mı?
- **Gün:** Hafta içi mi, hafta sonu mu?
- **Konum:** Neredesin? (Moda, Kadıköy, vb.)
- **Amaç:** Ne için? (çalışmak, randevu, arkadaşlarla, tek başına)

### 📍 Endpoint: `get_contextual_recommendations_api`

**URL:** `GET /api/places/contextual-recommendations/?time_of_day=17:00&day_of_week=monday&location=Moda&purpose=work`

**Query Parametreleri:**
- `time_of_day`: Saat (örn: "17:00")
- `day_of_week`: Gün (örn: "monday", "saturday")
- `location`: Konum (örn: "Moda", "Kadıköy")
- `purpose`: Amaç (örn: "work", "date", "friends", "solo")

**Ne Yapar:**
1. Kullanıcının beğendiği mekanları bulur
2. Bu mekanlardan graph üzerinden ilişkili mekanları bulur
3. Bağlamsal filtreler uygular (amaç, zaman, vb.)
4. Skorlarına göre sıralar ve döndürür

**Nasıl Çalışır:**
```python
# 1. Kullanıcının beğendiği mekanları al
liked_places = PlacePreference.objects.filter(
    user=user,
    action='like'
)

# 2. Her beğenilen mekan için graph'tan ilişkili mekanları bul
for liked_place in liked_places:
    connections = PlaceGraph.objects.filter(
        from_place=liked_place,
        strength__gte=0.5
    )
    
    # 3. Her bağlantı için öneri oluştur
    recommendations.append({
        'place': connection.to_place,
        'score': connection.strength,
        'reason': f"{liked_place.name} ile benzer",
        'relationship': connection.relationship_type
    })

# 4. Bağlamsal filtreleme
if purpose == 'work':
    # Sadece çalışma için uygun mekanları al
    recommendations = [
        r for r in recommendations
        if r['place'].use_cases.get('work', False)
    ]

# 5. Skora göre sırala
recommendations.sort(key=lambda x: x['score'], reverse=True)
```

**Örnek Kullanım:**
```javascript
// Kullanıcı "Çalışmak için bir yer arıyorum" dediğinde
const params = new URLSearchParams({
  time_of_day: '14:00',
  day_of_week: 'monday',
  location: 'Moda',
  purpose: 'work'
});

fetch(`/api/places/contextual-recommendations/?${params}`)
  .then(res => res.json())
  .then(data => {
    // data.recommendations: Bağlamsal öneriler
    data.recommendations.forEach(rec => {
      console.log(`${rec.place.name} - ${rec.reason} (${rec.score})`);
    });
  });
```

**Dönen Veri Yapısı:**
```json
{
  "success": true,
  "context": {
    "time_of_day": "17:00",
    "day_of_week": "monday",
    "location": "Moda",
    "purpose": "work"
  },
  "recommendations": [
    {
      "place": {
        "id": 5,
        "name": "Petra Coffee",
        "working_suitability": 85,
        "wifi_quality": "güçlü"
      },
      "score": 0.9,
      "reason": "Starbucks Moda ile benzer",
      "relationship": "similar"
    }
  ],
  "count": 10
}
```

---

## 🔄 Tüm Sistem Nasıl Birlikte Çalışır?

### Senaryo: Kullanıcı "Çalışmak için bir yer arıyorum" dedi

1. **Frontend:** `contextual-recommendations` API'sini çağırır
   ```
   GET /api/places/contextual-recommendations/?purpose=work&time_of_day=14:00
   ```

2. **Backend (`get_contextual_recommendations_api`):**
   - Kullanıcının beğendiği mekanları bulur
   - Her mekan için `PlaceGraph`'tan ilişkili mekanları bulur
   - `purpose=work` filtresini uygular (sadece `use_cases.work=True` olanları)
   - Skorlarına göre sıralar

3. **Frontend:** Önerileri gösterir
   - Her öneri için "Neden önerildi?" bilgisi gösterir
   - Sosyal eşleşme skorunu gösterir (eğer varsa)

### Senaryo: Kullanıcı bir mekanın detay sayfasına girdi

1. **Frontend:** İki API çağrısı yapar:
   ```
   GET /api/places/graph/123/          # Benzer mekanlar
   POST /api/places/social-match/calculate/  # Arkadaşların etkileşimleri
   ```

2. **Backend:**
   - `get_place_graph`: İlişkili mekanları döndürür
   - `calculate_social_match`: Arkadaşların bu mekanla etkileşimlerini hesaplar

3. **Frontend:** 
   - "Benzer Mekanlar" bölümünü gösterir
   - "5 arkadaşın burayı beğenmiş" bilgisini gösterir

---

## 📊 Veri Modelleri

### SocialMatching Modeli
```python
class SocialMatching(models.Model):
    user = ForeignKey(User)           # Hangi kullanıcı için
    place = ForeignKey(Place)         # Hangi mekan
    friend_likes = IntegerField       # Kaç arkadaş beğenmiş
    friend_visits = IntegerField      # Kaç arkadaş ziyaret etmiş
    friend_reviews = IntegerField     # Kaç arkadaş yorum yapmış
    match_score = FloatField          # Eşleşme skoru (0-1)
```

### PlaceGraph Modeli
```python
class PlaceGraph(models.Model):
    from_place = ForeignKey(Place)    # Kaynak mekan
    to_place = ForeignKey(Place)       # Hedef mekan
    relationship_type = CharField      # İlişki türü
    strength = FloatField              # İlişki gücü (0-1)
    co_like_count = IntegerField       # Birlikte beğenilme sayısı
    co_visit_count = IntegerField     # Birlikte ziyaret sayısı
```

---

## 🎓 Öğrenme Notları

### 1. API View Decorator'ları
```python
@api_view(['GET'])  # Sadece GET isteklerine izin ver
@permission_classes([IsAuthenticated])  # Giriş yapmış kullanıcılar için
def get_social_matches(request):
    # ...
```

### 2. Query Parameters
```python
# URL'den parametre almak
limit = int(request.query_params.get('limit', 10))  # Varsayılan: 10
```

### 3. Request Body (POST)
```python
# POST isteğinden veri almak
place_id = request.data.get('place_id')
```

### 4. Response Formatı
```python
# Başarılı yanıt
return Response({
    'success': True,
    'data': [...]
})

# Hata yanıtı
return Response(
    {'success': False, 'error': 'Hata mesajı'},
    status=status.HTTP_400_BAD_REQUEST
)
```

### 5. Serializer Kullanımı
```python
# Model'i JSON'a çevirmek için
serializer = PlaceSerializer(places, many=True)
return Response({'places': serializer.data})
```

---

## 🚀 Pratik Örnekler

### Frontend'de Kullanım

```javascript
// 1. Sosyal eşleşmeleri getir
async function getSocialMatches() {
  const res = await fetch('/api/places/social-matches/?limit=5');
  const data = await res.json();
  return data.places;
}

// 2. Bir mekan için graph ilişkilerini getir
async function getPlaceConnections(placeId) {
  const res = await fetch(`/api/places/graph/${placeId}/`);
  const data = await res.json();
  return data.connections;
}

// 3. Bağlamsal öneriler al
async function getContextualRecommendations(context) {
  const params = new URLSearchParams(context);
  const res = await fetch(`/api/places/contextual-recommendations/?${params}`);
  const data = await res.json();
  return data.recommendations;
}
```

---

## ❓ Sık Sorulan Sorular

**S: Sosyal eşleşme skoru nasıl hesaplanıyor?**
A: Arkadaşların etkileşimlerine göre:
- Beğeni: %50 ağırlık
- Ziyaret: %30 ağırlık  
- Yorum: %20 ağırlık
- Toplam arkadaş sayısına bölünerek normalize edilir (0-1 arası)

**S: Graph ilişkileri ne zaman oluşturuluyor?**
A: Genelde otomatik (yeni mekan eklendiğinde veya güncellendiğinde). 
Manuel olarak `build_graph_for_place` endpoint'ini çağırabilirsin.

**S: Bağlamsal öneriler gerçek zamanlı mı?**
A: Evet, her API çağrısında anlık olarak hesaplanır. 
Kullanıcının mevcut durumuna göre öneriler üretilir.

---

## 📝 Özet

Bu dosya, restoran öneri sisteminin **akıllı özelliklerini** sağlar:

1. **Sosyal Eşleştirme:** Arkadaşların tercihlerine göre öneriler
2. **Mekan Grafiği:** Mekanlar arası ilişkileri modelleyerek öneriler
3. **Bağlamsal Öneriler:** Kullanıcının durumuna göre kişiselleştirilmiş öneriler

Her özellik, kullanıcıya daha iyi öneriler sunmak için farklı bir yaklaşım kullanır.
