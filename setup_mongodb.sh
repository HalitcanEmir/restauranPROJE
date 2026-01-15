#!/bin/bash
# MongoDB Environment Variables Setup Script

echo "MongoDB Atlas Bağlantı Ayarları"
echo "================================"
echo ""
echo "Kullanıcı adı: halitcanemir06"
echo ""
read -sp "MongoDB şifresini girin: " MONGODB_PASSWORD
echo ""
echo ""

export MONGODB_USERNAME="halitcanemir06"
export MONGODB_PASSWORD="$MONGODB_PASSWORD"

echo "✓ Environment variable'lar ayarlandı!"
echo ""
echo "Bağlantıyı test etmek için:"
echo "  python manage_mongodb.py test"
echo ""
echo "Not: Bu ayarlar sadece bu terminal oturumu için geçerlidir."
echo "Kalıcı yapmak için .env dosyası kullanın veya shell config dosyanıza ekleyin."
