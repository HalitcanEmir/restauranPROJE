from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Place
from visits.models import Visit
from visits.forms import VisitForm
from .serializers import PlaceSerializer, PlaceDetailSerializer


class PlaceListAPIView(generics.ListAPIView):
    """Mekan listesi API"""
    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = Place.objects.all()
        
        city = self.request.query_params.get('city', None)
        category = self.request.query_params.get('category', None)
        mode = self.request.query_params.get('mode', None)
        search = self.request.query_params.get('search', None)
        
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        if category:
            queryset = queryset.filter(categories__contains=[category])
        
        if mode:
            queryset = queryset.filter(categories__contains=[mode])
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(address__icontains=search)
            )
        
        return queryset


class PlaceDetailAPIView(generics.RetrieveAPIView):
    """Mekan detay API"""
    queryset = Place.objects.all()
    serializer_class = PlaceDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def AddReviewAPIView(request, place_id):
    """Kart tabanlı değerlendirme ekleme API"""
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Kullanıcının daha önce değerlendirmesi var mı?
    try:
        visit = Visit.objects.get(user=request.user, place=place)
    except Visit.DoesNotExist:
        visit = None
    
    if request.method == 'POST':
        try:
            data = request.data
            
            # Yeni alanları al
            sentiment = data.get('sentiment', '') or None
            tags = data.get('tags', [])
            suitable_for = data.get('suitable_for', [])
            atmosphere = data.get('atmosphere', [])
            comment = data.get('comment', '') or ''
            rating = data.get('rating', None)
            
            # Rating'i integer'a çevir (varsa)
            if rating is not None and rating != '':
                try:
                    rating = int(rating)
                except (ValueError, TypeError):
                    rating = None
            else:
                rating = None
            
            # Validasyon - en az sentiment veya rating olmalı
            if not sentiment and not rating:
                return Response(
                    {'success': False, 'error': 'En az sentiment veya rating gerekli'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Visit oluştur veya güncelle
            if visit is None:
                visit = Visit.objects.create(
                    user=request.user,
                    place=place,
                    sentiment=sentiment,
                    tags=tags if isinstance(tags, list) else [],
                    suitable_for=suitable_for if isinstance(suitable_for, list) else [],
                    atmosphere=atmosphere if isinstance(atmosphere, list) else [],
                    comment=comment,
                    rating=rating,
                )
            else:
                if sentiment:
                    visit.sentiment = sentiment
                if tags:
                    visit.tags = tags if isinstance(tags, list) else visit.tags
                if suitable_for:
                    visit.suitable_for = suitable_for if isinstance(suitable_for, list) else visit.suitable_for
                if atmosphere:
                    visit.atmosphere = atmosphere if isinstance(atmosphere, list) else visit.atmosphere
                if comment:
                    visit.comment = comment
                if rating:
                    visit.rating = rating
                visit.save()
            
            # UserScore'u güncelle (+10 puan)
            from social.models import UserScore
            score, created = UserScore.objects.get_or_create(user=request.user)
            score.city = request.user.profile.city or ''
            score.total_points += 10  # Her değerlendirme için +10 puan
            score.save()
            
            return Response({
                'success': True,
                'message': 'Değerlendirme başarıyla kaydedildi',
                'visit_id': visit.id,
                'points_earned': 10,
                'total_points': score.total_points
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            return Response({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
