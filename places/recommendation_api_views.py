"""
Recommendation API Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Avg, Count
from .recommendations import get_recommendations
from .models import Place, PlacePreference
from .serializers import PlaceSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations_api(request):
    """
    Kullanıcı için öneriler döner (Swipe için)
    GET /api/places/recommendations/
    
    Query Parameters:
        - category: string (comma-separated) - örn: "coffee,brunch"
        - atmosphere: string (comma-separated) - örn: "quiet,esthetic"
        - context: string - örn: "friends", "sevgili", "arkadaş"
        - price: string - örn: "$$", "₺₺"
        - limit: int - maksimum öneri sayısı (default: 20)
    """
    user = request.user
    
    # Query parametrelerini al
    query_params = {}
    
    category = request.query_params.get('category', '')
    if category:
        query_params['category'] = category
    
    atmosphere = request.query_params.get('atmosphere', '')
    if atmosphere:
        query_params['atmosphere'] = atmosphere
    
    context = request.query_params.get('context', '')
    if context:
        query_params['context'] = context
    
    price = request.query_params.get('price', '')
    if price:
        query_params['price'] = price
    
    # Limit
    try:
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 50)  # Max 50
    except (ValueError, TypeError):
        limit = 20
    
    # Önerileri al (get_recommendations fonksiyonu zaten en çok beğenilen mekanları önceliklendiriyor)
    try:
        query_dict, results = get_recommendations(user, query_params if query_params else None, limit)
        
        # PlaceSerializer ile serialize et
        place_ids = [r.get('id') for r in results if r.get('id')]
        if place_ids:
            places = Place.objects.filter(id__in=place_ids)
            # Sıralamayı korumak için dict kullan
            place_dict = {p.id: p for p in places}
            
            serializer = PlaceSerializer([place_dict[r['id']] for r in results if r['id'] in place_dict], many=True)
            final_results = serializer.data
            
            # Score bilgisini ekle (her sonuç için)
            for i, result in enumerate(results):
                if i < len(final_results) and final_results[i]['id'] == result.get('id'):
                    final_results[i]['score'] = result.get('score', 0)
                    final_results[i]['location'] = result.get('location', '')
        else:
            final_results = []
        
        return Response({
            'success': True,
            'query': query_dict,
            'places': final_results,  # Swipe için 'places' key'i kullan
            'count': len(final_results)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Recommendation error: {error_trace}")
        return Response({
            'success': False,
            'error': str(e),
            'trace': error_trace if request.user.is_staff else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
