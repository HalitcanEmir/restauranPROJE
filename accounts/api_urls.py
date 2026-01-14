from django.urls import path
from . import api_views

app_name = 'accounts_api'

urlpatterns = [
    path('users/<username>/', api_views.UserProfileAPIView.as_view(), name='user_profile'),
]
