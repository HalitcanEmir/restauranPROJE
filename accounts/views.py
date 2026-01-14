from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.http import Http404
from .forms import RegisterForm, ProfileEditForm

User = get_user_model()


def register(request):
    """Kullanıcı kayıt sayfası"""
    if request.user.is_authenticated:
        return redirect('places:home')
    
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Kayıt başarılı! Hoş geldiniz!')
            return redirect('places:home')
    else:
        form = RegisterForm()
    
    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    """Giriş sayfası"""
    if request.user.is_authenticated:
        return redirect('places:home')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            messages.success(request, f'Hoş geldiniz, {user.username}!')
            return redirect('places:home')
        else:
            messages.error(request, 'Kullanıcı adı veya şifre hatalı!')
    
    return render(request, 'accounts/login.html')


def logout_view(request):
    """Çıkış"""
    from django.contrib.auth import logout
    logout(request)
    messages.success(request, 'Başarıyla çıkış yaptınız.')
    return redirect('places:home')


def profile_view(request, username):
    """Kullanıcı profil sayfası"""
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404("Kullanıcı bulunamadı")
    
    visits = user.visits.all()[:10]  # Son 10 ziyaret
    is_own_profile = request.user == user
    
    context = {
        'profile_user': user,
        'visits': visits,
        'is_own_profile': is_own_profile,
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit(request):
    """Profil düzenleme sayfası"""
    profile = request.user.profile
    
    if request.method == 'POST':
        form = ProfileEditForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profil başarıyla güncellendi!')
            return redirect('accounts:profile', username=request.user.username)
    else:
        form = ProfileEditForm(instance=profile)
    
    return render(request, 'accounts/profile_edit.html', {'form': form})


@login_required
def taste_profile_view(request):
    """Zevk profili sayfası"""
    return render(request, 'accounts/taste_profile.html')
