from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserProfileSerializer

User = get_user_model()


class UserProfileAPIView(generics.RetrieveAPIView):
    """Kullanıcı profil API"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'username'
    
    def get_queryset(self):
        return User.objects.all()
