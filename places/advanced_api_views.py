"""
Advanced Features API Views
- Social Matching
- Local Discovery Graph
- Contextual Recommendations
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Place, SocialMatching, PlaceGraph
from .serializers import PlaceSerializer
from .advanced_features import calculate_social_matching, build_place_graph, get_contextual_recommendations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_social_matches(request):
    """
    Kullanıcı için sosyal eşleşmeleri getirir
    Arkadaşların beğendiği mekanlar
    """
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    
    # Sosyal eşleşmeleri al
    matches = SocialMatching.objects.filter(
        user=user,
        match_score__gt=0
    ).order_by('-match_score')[:limit]
    
    places = [match.place for match in matches]
    serializer = PlaceSerializer(places, many=True)
    
    # Eşleşme skorlarını ekle
    result_data = []
    for i, place_data in enumerate(serializer.data):
        match = matches[i]
        place_data['social_match'] = {
            'score': match.match_score,
            'friend_likes': match.friend_likes,
            'friend_visits': match.friend_visits,
            'friend_reviews': match.friend_reviews
        }
        result_data.append(place_data)
    
    return Response({
        'success': True,
        'places': result_data,
        'count': len(result_data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_social_match(request):
    """
    Belirli bir mekan için sosyal eşleşme skorunu hesaplar
    body: { place_id: int }
    """
    user = request.user
    place_id = request.data.get('place_id')
    
    if not place_id:
        return Response(
            {'success': False, 'error': 'place_id gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    social_match = calculate_social_matching(user, place)
    
    if social_match:
        return Response({
            'success': True,
            'match_score': social_match.match_score,
            'friend_likes': social_match.friend_likes,
            'friend_visits': social_match.friend_visits,
            'friend_reviews': social_match.friend_reviews
        })
    else:
        return Response({
            'success': False,
            'message': 'Arkadaş bulunamadı veya eşleşme hesaplanamadı'
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_place_graph(request, place_id):
    """
    Bir mekan için Local Discovery Graph ilişkilerini getirir
    """
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Graph ilişkilerini al
    connections = PlaceGraph.objects.filter(
        from_place=place
    ).order_by('-strength')[:10]
    
    result = []
    for connection in connections:
        serializer = PlaceSerializer(connection.to_place)
        result.append({
            'place': serializer.data,
            'relationship_type': connection.relationship_type,
            'strength': connection.strength,
            'co_like_count': connection.co_like_count,
            'co_visit_count': connection.co_visit_count
        })
    
    return Response({
        'success': True,
        'place_name': place.name,
        'connections': result,
        'count': len(result)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def build_graph_for_place(request, place_id):
    """
    Bir mekan için graph ilişkilerini oluştur/güncelle
    """
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    build_place_graph(place)
    
    return Response({
        'success': True,
        'message': f'{place.name} için graph ilişkileri oluşturuldu/güncellendi'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contextual_recommendations_api(request):
    """
    Bağlamsal öneriler getirir
    Query params: time_of_day, day_of_week, location, purpose
    """
    user = request.user
    
    # Bağlam bilgilerini al
    context = {
        'time_of_day': request.query_params.get('time_of_day'),
        'day_of_week': request.query_params.get('day_of_week'),
        'location': request.query_params.get('location'),
        'purpose': request.query_params.get('purpose')  # work, date, friends, solo
    }
    
    # None değerleri temizle
    context = {k: v for k, v in context.items() if v}
    
    recommendations = get_contextual_recommendations(user, context)
    
    result = []
    for rec in recommendations:
        serializer = PlaceSerializer(rec['place'])
        result.append({
            'place': serializer.data,
            'score': rec['score'],
            'reason': rec['reason'],
            'relationship': rec['relationship']
        })
    
    return Response({
        'success': True,
        'context': context,
        'recommendations': result,
        'count': len(result)
    })
