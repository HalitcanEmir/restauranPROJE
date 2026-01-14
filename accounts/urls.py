from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('<username>/', views.profile_view, name='profile'),
    path('edit/', views.profile_edit, name='profile_edit'),
]
