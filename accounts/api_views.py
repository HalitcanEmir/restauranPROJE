from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .serializers import UserProfileSerializer

User = get_user_model()


class UserProfileAPIView(generics.RetrieveAPIView):
    """Kullanıcı profil API"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'username'
    
    def get_queryset(self):
        return User.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Kullanıcı arama API
    Query param: q (arama terimi)
    """
    query = request.query_params.get('q', '').strip()
    
    if len(query) < 2:
        return Response({
            'success': True,
            'users': [],
            'count': 0
        })
    
    # Kullanıcıları ara (username ve display_name'e göre)
    users = User.objects.filter(
        Q(username__icontains=query) |
        Q(profile__display_name__icontains=query)
    ).exclude(id=request.user.id)[:10]  # Kendi kullanıcısını hariç tut, max 10 sonuç
    
    # Mevcut arkadaşları ve bekleyen istekleri kontrol et
    from social.models import Friendship
    friendships = Friendship.objects.filter(
        Q(requester=request.user) | Q(receiver=request.user)
    )
    
    friend_ids = set()
    pending_ids = set()
    
    for friendship in friendships:
        other_user = friendship.receiver if friendship.requester == request.user else friendship.requester
        friend_ids.add(other_user.id)
        if friendship.status == 'pending':
            pending_ids.add(other_user.id)
    
    # Sonuçları formatla
    results = []
    for user in users:
        is_friend = user.id in friend_ids
        is_pending = user.id in pending_ids
        
        results.append({
            'id': user.id,
            'username': user.username,
            'display_name': user.profile.get_display_name if hasattr(user, 'profile') else user.username,
            'city': user.profile.city if hasattr(user, 'profile') else '',
            'is_friend': is_friend,
            'is_pending': is_pending
        })
    
    return Response({
        'success': True,
        'users': results,
        'count': len(results)
    })
