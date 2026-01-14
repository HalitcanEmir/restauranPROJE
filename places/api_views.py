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
    """Değerlendirme ekleme API"""
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
        data = request.data.copy()
        data['user'] = request.user.id
        data['place'] = place.id
        
        form = VisitForm(data, instance=visit)
        if form.is_valid():
            visit = form.save(commit=False)
            visit.user = request.user
            visit.place = place
            visit.save()
            
            # UserScore'u güncelle
            from social.models import UserScore
            score, created = UserScore.objects.get_or_create(user=request.user)
            score.city = request.user.profile.city or ''
            score.calculate_score()
            
            return Response({
                'success': True,
                'message': 'Değerlendirme başarıyla kaydedildi',
                'visit_id': visit.id
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
