# ⚠️ MongoDB Atlas Bağlantı Notu

## Mevcut Durum

Mevcut connection string:
```
mongodb://atlas-sql-688228f7978bec551476ca2b-k4jqir.a.query.mongodb.net/btkdb
```

Bu bir **Atlas SQL / Data Federation** cluster'ı. Bu tip cluster'larda:
- ✅ Okuma işlemleri yapılabilir (SELECT sorguları)
- ❌ Yazma işlemleri yapılamaz (INSERT, UPDATE, DELETE)

## Çözüm: Normal MongoDB Cluster Kullanın

Yazma işlemleri için **normal MongoDB cluster** kullanmanız gerekiyor.

### MongoDB Atlas'ta Normal Cluster Oluşturma:

1. MongoDB Atlas Dashboard'a gidin
2. "Database" sekmesine tıklayın
3. "Create" → "Database" seçin
4. Normal cluster oluşturun (M0 Free tier yeterli)
5. Connection string'i alın (şu formatta olmalı):
   ```
   mongodb+srv://halitcanemir06:RZlMOfHkkyQNrAWO@cluster0.xxxxx.mongodb.net/btkdb?retryWrites=true&w=majority
   ```

### Connection String'i Güncelleme:

`config/settings.py` dosyasında connection string'i değiştirin:

```python
MONGODB_URI = f"mongodb+srv://{quote_plus(MONGODB_USERNAME)}:{quote_plus(MONGODB_PASSWORD)}@cluster0.xxxxx.mongodb.net/btkdb?retryWrites=true&w=majority"
```

## Mevcut Bağlantı ile Ne Yapılabilir?

Mevcut Atlas SQL cluster ile:
- ✅ Veri okuma (SELECT sorguları)
- ✅ Analiz işlemleri
- ❌ Veri yazma (INSERT, UPDATE, DELETE)

Eğer sadece okuma yapacaksanız, mevcut bağlantı yeterli. Yazma işlemleri için normal cluster gerekli.
