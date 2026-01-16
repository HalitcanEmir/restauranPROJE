from django.urls import path
from . import api_views, discover_api_views, recommendation_api_views, advanced_api_views

app_name = 'places_api'

urlpatterns = [
    path('', api_views.PlaceListAPIView.as_view(), name='place_list'),
    path('<int:pk>/', api_views.PlaceDetailAPIView.as_view(), name='place_detail'),
    path('<int:place_id>/review/', api_views.AddReviewAPIView, name='add_review'),
    # Swipe keşfet endpoint'leri
    path('discover/', discover_api_views.discover_places, name='discover'),
    path('discover/swipe/', discover_api_views.swipe_place, name='swipe'),
    path('discover/preferences/', discover_api_views.get_preferences, name='preferences'),
    # Recommendation endpoint
    path('recommendations/', recommendation_api_views.get_recommendations_api, name='recommendations'),
    # Advanced Features endpoints
    path('social-matches/', advanced_api_views.get_social_matches, name='social_matches'),
    path('social-match/calculate/', advanced_api_views.calculate_social_match, name='calculate_social_match'),
    path('graph/<int:place_id>/', advanced_api_views.get_place_graph, name='place_graph'),
    path('graph/<int:place_id>/build/', advanced_api_views.build_graph_for_place, name='build_graph'),
    path('contextual-recommendations/', advanced_api_views.get_contextual_recommendations_api, name='contextual_recommendations'),
]
