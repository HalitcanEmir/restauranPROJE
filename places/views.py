from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Avg
from .models import Place
from visits.models import Visit
from visits.forms import VisitForm


def home(request):
    """Ana sayfa - Mod seçimi"""
    if not request.user.is_authenticated:
        return render(request, 'places/home.html')
    
    # Giriş yapmış kullanıcı için keşfet sayfasına yönlendir
    return redirect('places:discover')


def discover(request):
    """Mekan keşfet sayfası"""
    places = Place.objects.all()
    
    # Filtreler
    city = request.GET.get('city', '')
    category = request.GET.get('category', '')
    mode = request.GET.get('mode', '')
    search = request.GET.get('search', '')
    
    if city:
        places = places.filter(city__icontains=city)
    
    if category:
        places = places.filter(categories__contains=[category])
    
    if mode:
        places = places.filter(categories__contains=[mode])
    
    if search:
        places = places.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(address__icontains=search)
        )
    
    # Ortalama puanları hesapla
    for place in places:
        place.avg_rating = place.average_rating
        place.visit_count = place.total_visits
    
    context = {
        'places': places,
        'city': city,
        'category': category,
        'mode': mode,
        'search': search,
    }
    return render(request, 'places/discover.html', context)


def place_detail(request, place_id):
    """Mekan detay sayfası"""
    place = get_object_or_404(Place, id=place_id)
    visits = Visit.objects.filter(place=place).order_by('-visited_at')[:20]
    
    # Kullanıcının bu mekana ziyareti var mı?
    user_visit = None
    if request.user.is_authenticated:
        try:
            user_visit = Visit.objects.get(user=request.user, place=place)
        except Visit.DoesNotExist:
            pass
    
    context = {
        'place': place,
        'visits': visits,
        'user_visit': user_visit,
        'average_rating': place.average_rating,
        'total_visits': place.total_visits,
    }
    return render(request, 'places/place_detail.html', context)


@login_required
def add_review(request, place_id):
    """Değerlendirme ekleme sayfası"""
    place = get_object_or_404(Place, id=place_id)
    
    # Kullanıcının daha önce değerlendirmesi var mı?
    try:
        visit = Visit.objects.get(user=request.user, place=place)
        is_update = True
    except Visit.DoesNotExist:
        visit = None
        is_update = False
    
    if request.method == 'POST':
        form = VisitForm(request.POST, instance=visit)
        if form.is_valid():
            visit = form.save(commit=False)
            visit.user = request.user
            visit.place = place
            visit.save()
            
            # UserScore'u güncelle
            from social.models import UserScore
            score, created = UserScore.objects.get_or_create(user=request.user)
            score.city = request.user.profile.city or ''
            score.calculate_score()
            
            messages.success(request, 'Değerlendirme başarıyla kaydedildi!')
            return redirect('places:place_detail', place_id=place.id)
    else:
        form = VisitForm(instance=visit)
    
    context = {
        'form': form,
        'place': place,
        'is_update': is_update,
    }
    return render(request, 'places/add_review.html', context)
