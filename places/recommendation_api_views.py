"""
Recommendation API Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .recommendations import get_recommendations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations_api(request):
    """
    Kullanıcı için öneriler döner
    GET /api/places/recommendations/
    
    Query Parameters:
        - category: string (comma-separated) - örn: "coffee,brunch"
        - atmosphere: string (comma-separated) - örn: "quiet,esthetic"
        - context: string - örn: "friends", "sevgili", "arkadaş"
        - price: string - örn: "$$", "₺₺"
        - limit: int - maksimum öneri sayısı (default: 10)
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
        limit = int(request.query_params.get('limit', 10))
        limit = min(limit, 50)  # Max 50
    except (ValueError, TypeError):
        limit = 10
    
    # Önerileri al
    try:
        query_dict, results = get_recommendations(user, query_params if query_params else None, limit)
        
        return Response({
            'success': True,
            'query': query_dict,
            'results': results,
            'count': len(results)
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
