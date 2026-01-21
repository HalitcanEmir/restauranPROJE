"""
Management command to seed user data (visits and friendships) for a specific user
Usage: python manage.py seed_user_data HalitcanHalitcaaannn
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, date, time, timedelta
import random

from accounts.models import User
from places.models import Place
from visits.models import Visit
from social.models import Friendship


class Command(BaseCommand):
    help = 'Seed visits and friendships for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to seed data for')
        parser.add_argument(
            '--visits',
            type=int,
            default=150,
            help='Number of visits to create (default: 150)'
        )
        parser.add_argument(
            '--friends',
            type=int,
            default=10,
            help='Number of friendships to create (default: 10)'
        )

    def handle(self, *args, **options):
        username = options['username']
        num_visits = options['visits']
        num_friends = options['friends']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Kullanıcı "{username}" bulunamadı!')
            )
            return

        self.stdout.write(f'Kullanıcı bulundu: {user.username}')

        # 1. Ziyaretler oluştur
        self.stdout.write(f'\n{num_visits} adet ziyaret oluşturuluyor...')
        places = list(Place.objects.all()[:500])
        
        if not places:
            self.stdout.write(
                self.style.WARNING('Hiç mekan bulunamadı! Önce mekan eklemeniz gerekiyor.')
            )
        else:
            created_visits = 0
            today = date.today()
            used_place_ids = set()

            for i in range(num_visits):
                # Son 365 gün içinde rastgele bir tarih
                day_offset = random.randint(0, 364)
                visit_date = today - timedelta(days=day_offset)

                # Rastgele bir mekan seç
                place = random.choice(places)
                
                # Aynı user+place kombinasyonu varsa atla (unique constraint)
                if Visit.objects.filter(user=user, place=place).exists():
                    continue

                # Tarih ve saat oluştur
                visit_time = time(
                    hour=random.randint(12, 22),
                    minute=random.choice([0, 15, 30, 45])
                )
                visited_at = timezone.make_aware(
                    datetime.combine(visit_date, visit_time)
                )

                # Rastgele değerlendirme verileri
                rating = random.randint(3, 5)
                sentiment_choices = ['excellent', 'good', 'meh']
                sentiment = random.choice(sentiment_choices)
                
                tags = random.sample(
                    ['butik', 'modern', 'mahalle', 'trendy', 'sakin', 'kalabalık'],
                    k=random.randint(1, 3)
                )
                suitable_for = random.sample(
                    ['arkadaş', 'sevgili', 'aile', 'tek'],
                    k=random.randint(1, 2)
                )
                atmosphere = random.sample(
                    ['sessiz', 'müzikli', 'estetik', 'manzaralı', 'rahat'],
                    k=random.randint(1, 3)
                )

                comment_options = [
                    'Çok güzel bir yer, tekrar gelmek isterim.',
                    'Fiyatlar uygun, lezzetli yemekler.',
                    'Atmosfer harika, personel çok ilgili.',
                    'Mekan çok şık, fotoğraf çekmek için ideal.',
                    'Kahve çok iyi, pastalar da lezzetli.',
                    'Genel olarak memnun kaldım.',
                ]
                comment = random.choice(comment_options)

                # Visit oluştur
                visit = Visit.objects.create(
                    user=user,
                    place=place,
                    visited_at=visited_at,
                    rating=rating,
                    sentiment=sentiment,
                    tags=tags,
                    suitable_for=suitable_for,
                    atmosphere=atmosphere,
                    comment=comment,
                )

                created_visits += 1
                used_place_ids.add(place.id)

                if created_visits % 20 == 0:
                    self.stdout.write(f'  {created_visits} ziyaret oluşturuldu...')

            self.stdout.write(
                self.style.SUCCESS(f'✓ {created_visits} ziyaret başarıyla oluşturuldu!')
            )

        # 2. Arkadaşlıklar oluştur
        self.stdout.write(f'\n{num_friends} adet arkadaşlık oluşturuluyor...')
        all_users = list(User.objects.exclude(username=username)[:100])
        
        if not all_users:
            self.stdout.write(
                self.style.WARNING('Başka kullanıcı bulunamadı! Arkadaşlık oluşturulamadı.')
            )
        else:
            created_friendships = 0
            random.shuffle(all_users)

            for other_user in all_users[:num_friends]:
                # Zaten arkadaşlık var mı kontrol et
                existing = Friendship.objects.filter(
                    (Q(requester=user, receiver=other_user) |
                     Q(requester=other_user, receiver=user))
                ).first()

                if existing:
                    continue

                # %70 accepted, %30 pending
                status = 'accepted' if random.random() < 0.7 else 'pending'
                
                # Rastgele kim istek gönderdi
                if random.random() < 0.5:
                    requester = user
                    receiver = other_user
                else:
                    requester = other_user
                    receiver = user

                friendship = Friendship.objects.create(
                    requester=requester,
                    receiver=receiver,
                    status=status
                )

                created_friendships += 1
                self.stdout.write(
                    f'  {requester.username} -> {receiver.username} ({status})'
                )

            self.stdout.write(
                self.style.SUCCESS(f'✓ {created_friendships} arkadaşlık oluşturuldu!')
            )

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Tüm işlemler tamamlandı!')
        )
