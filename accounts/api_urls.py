from django.urls import path
from . import api_views, taste_api_views

app_name = 'accounts_api'

urlpatterns = [
    path('users/<username>/', api_views.UserProfileAPIView.as_view(), name='user_profile'),
    path('me/taste-profile/', taste_api_views.get_taste_profile, name='taste_profile'),
    path('me/taste-profile/recalculate/', taste_api_views.recalculate_taste_profile, name='recalculate_taste_profile'),
]
