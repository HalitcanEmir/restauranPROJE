from django.urls import path
from . import views

app_name = 'places'

urlpatterns = [
    path('', views.home, name='home'),
    path('discover/', views.discover, name='discover'),
    path('discover/swipe/', views.discover_swipe, name='discover_swipe'),
    path('favorites/', views.favorites, name='favorites'),
    path('<int:place_id>/', views.place_detail, name='place_detail'),
    path('<int:place_id>/review/', views.add_review, name='add_review'),
]
