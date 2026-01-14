from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from accounts.models import User
from visits.models import Visit
from .models import Friendship, UserScore
from .serializers import VisitSerializer, FriendshipSerializer, UserScoreSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def FriendsFeedAPIView(request):
    """Arkadaş feed API"""
    # Kullanıcının arkadaşlarını al
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )
    
    friends = []
    for friendship in friendships:
        if friendship.requester == request.user:
            friends.append(friendship.receiver)
        else:
            friends.append(friendship.requester)
    
    # Arkadaşların son ziyaretlerini al
    visits = Visit.objects.filter(user__in=friends).order_by('-visited_at')[:50]
    serializer = VisitSerializer(visits, many=True)
    
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def FriendRequestAPIView(request):
    """Arkadaşlık isteği gönderme API"""
    username = request.data.get('username')
    
    if not username:
        return Response(
            {'error': 'username parametresi gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        receiver = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': 'Kullanıcı bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if receiver == request.user:
        return Response(
            {'error': 'Kendinize arkadaşlık isteği gönderemezsiniz'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Daha önce istek var mı?
    existing = Friendship.objects.filter(
        Q(requester=request.user, receiver=receiver) |
        Q(requester=receiver, receiver=request.user)
    ).first()
    
    if existing:
        if existing.status == 'accepted':
            return Response({'error': 'Zaten arkadaşsınız'}, status=status.HTTP_400_BAD_REQUEST)
        elif existing.status == 'pending':
            return Response({'error': 'İstek zaten gönderilmiş'}, status=status.HTTP_400_BAD_REQUEST)
    
    friendship = Friendship.objects.create(
        requester=request.user,
        receiver=receiver,
        status='pending'
    )
    
    serializer = FriendshipSerializer(friendship)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def FriendRespondAPIView(request):
    """Arkadaşlık isteğine yanıt verme API"""
    request_id = request.data.get('request_id')
    action = request.data.get('action')  # 'accept' veya 'reject'
    
    if not request_id or not action:
        return Response(
            {'error': 'request_id ve action parametreleri gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        friendship = Friendship.objects.get(id=request_id, receiver=request.user)
    except Friendship.DoesNotExist:
        return Response(
            {'error': 'İstek bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if action == 'accept':
        friendship.status = 'accepted'
        friendship.save()
        return Response({'success': True, 'message': 'Arkadaşlık isteği kabul edildi'})
    elif action == 'reject':
        friendship.status = 'rejected'
        friendship.save()
        return Response({'success': True, 'message': 'Arkadaşlık isteği reddedildi'})
    else:
        return Response(
            {'error': 'Geçersiz action. accept veya reject olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )


class LeaderboardAPIView(generics.ListAPIView):
    """Liderlik tablosu API"""
    serializer_class = UserScoreSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = UserScore.objects.all().order_by('-total_points')
        city = self.request.query_params.get('city', None)
        
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        return queryset[:100]
