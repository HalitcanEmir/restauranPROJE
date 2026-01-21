from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from accounts.models import User
from visits.models import Visit
from .models import Friendship, UserScore, GroupPlan


@login_required
def friends_feed(request):
    """Arkadaş alanı ana sayfası (özet/navigasyon)"""
    # Arkadaş ve istek sayıları için basit özet
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )
    friends_count = friendships.count()

    pending_requests = Friendship.objects.filter(
        Q(receiver=request.user, status='pending') |
        Q(requester=request.user, status='pending')
    ).count()

    # Arkadaşların toplam ziyaret sayısı
    friend_users = []
    for friendship in friendships:
        friend_users.append(
            friendship.receiver if friendship.requester == request.user else friendship.requester
        )

    activity_count = Visit.objects.filter(user__in=friend_users).count() if friend_users else 0

    context = {
        'friends_count': friends_count,
        'pending_requests_count': pending_requests,
        'activity_count': activity_count,
    }
    return render(request, 'social/friends_feed.html', context)


@login_required
def friends_activity(request):
    """Arkadaşların gittiği yerler feed sayfası"""
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )

    friends = []
    for friendship in friendships:
        if friendship.requester == request.user:
            friends.append(friendship.receiver)
        else:
            friends.append(friendship.requester)

    visits = Visit.objects.filter(user__in=friends).order_by('-visited_at')[:50]

    context = {
        'visits': visits,
        'friends': friends,
    }
    return render(request, 'social/friends_activity.html', context)


@login_required
def friends_list(request):
    """Arkadaş listesi sayfası"""
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )
    
    friends = []
    for friendship in friendships:
        if friendship.requester == request.user:
            friends.append({
                'user': friendship.receiver,
                'friendship': friendship
            })
        else:
            friends.append({
                'user': friendship.requester,
                'friendship': friendship
            })
    
    context = {
        'friends': friends,
    }
    return render(request, 'social/friends_list.html', context)


@login_required
def friend_requests(request):
    """Arkadaşlık istekleri sayfası"""
    received_requests = Friendship.objects.filter(
        receiver=request.user,
        status='pending'
    )
    
    sent_requests = Friendship.objects.filter(
        requester=request.user,
        status='pending'
    )
    
    if request.method == 'POST':
        action = request.POST.get('action')
        request_id = request.POST.get('request_id')
        
        try:
            friendship = Friendship.objects.get(id=request_id)
            
            if action == 'accept' and friendship.receiver == request.user:
                friendship.status = 'accepted'
                friendship.save()
                messages.success(request, f'{friendship.requester.username} ile arkadaş oldunuz!')
            elif action == 'reject' and friendship.receiver == request.user:
                friendship.status = 'rejected'
                friendship.save()
                messages.info(request, 'İstek reddedildi.')
            elif action == 'cancel' and friendship.requester == request.user:
                friendship.delete()
                messages.info(request, 'İstek iptal edildi.')
        except Friendship.DoesNotExist:
            messages.error(request, 'İstek bulunamadı.')
        
        return redirect('social:friend_requests')
    
    context = {
        'received_requests': received_requests,
        'sent_requests': sent_requests,
    }
    return render(request, 'social/friend_requests.html', context)


@login_required
def leaderboard(request):
    """Liderlik tablosu"""
    city = request.GET.get('city', '')
    
    if city:
        scores = UserScore.objects.filter(city__icontains=city).order_by('-total_points')[:100]
    else:
        scores = UserScore.objects.all().order_by('-total_points')[:100]
    
    # Kullanıcının sırasını bul
    user_rank = None
    if request.user.is_authenticated:
        try:
            user_score = UserScore.objects.get(user=request.user)
            all_scores = UserScore.objects.filter(total_points__gt=user_score.total_points).count()
            user_rank = all_scores + 1
        except UserScore.DoesNotExist:
            pass
    
    context = {
        'scores': scores,
        'city': city,
        'user_rank': user_rank,
    }
    return render(request, 'social/leaderboard.html', context)


@login_required
def group_plans(request):
    """Grup planları listesi"""
    return render(request, 'social/group_plans.html')


@login_required
def group_plan_detail(request, plan_id):
    """Grup plan detay sayfası"""
    plan = get_object_or_404(GroupPlan, id=plan_id)
    
    # Erişim kontrolü
    is_creator = plan.creator == request.user
    is_participant = plan.participants.filter(user=request.user).exists()
    
    if not (is_creator or is_participant):
        messages.error(request, 'Bu plana erişim yetkiniz yok.')
        return redirect('social:group_plans')
    
    context = {
        'plan': plan,
        'is_creator': is_creator,
        'is_participant': is_participant,
    }
    return render(request, 'social/group_plan_detail.html', context)


@login_required
def create_group_plan(request):
    """Yeni grup planı oluştur"""
    return render(request, 'social/create_group_plan.html')
