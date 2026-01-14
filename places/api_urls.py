from django.urls import path
from . import api_views

app_name = 'places_api'

urlpatterns = [
    path('', api_views.PlaceListAPIView.as_view(), name='place_list'),
    path('<int:pk>/', api_views.PlaceDetailAPIView.as_view(), name='place_detail'),
    path('<int:place_id>/review/', api_views.AddReviewAPIView, name='add_review'),
]
