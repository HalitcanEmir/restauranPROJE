"""
Grup Planlama API Views
Arkadaşlarla birlikte mekan seçimi, oylama ve takvim entegrasyonu
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
from accounts.models import User
from places.models import Place
from .models import GroupPlan, PlanParticipant, PlanVote, PlanPlaceOption, Friendship
from .serializers import (
    GroupPlanSerializer, GroupPlanListSerializer,
    PlanParticipantSerializer, PlanVoteSerializer, PlanPlaceOptionSerializer
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def group_plans_api(request):
    """
    GET: Kullanıcının planlarını listele
    POST: Yeni plan oluştur
    """
    if request.method == 'GET':
        # Kullanıcının oluşturduğu veya katıldığı planlar
        user_plans = GroupPlan.objects.filter(
            Q(creator=request.user) |
            Q(participants__user=request.user)
        ).distinct().order_by('-created_at')
        
        # Filtreler
        status_filter = request.query_params.get('status', None)
        if status_filter:
            user_plans = user_plans.filter(status=status_filter)
        
        serializer = GroupPlanListSerializer(user_plans, many=True)
        return Response({
            'success': True,
            'plans': serializer.data,
            'count': len(serializer.data)
        })
    
    elif request.method == 'POST':
        # Yeni plan oluştur
        title = request.data.get('title')
        description = request.data.get('description', '')
        planned_date = request.data.get('planned_date', None)
        deadline = request.data.get('deadline', None)
        poll_questions = request.data.get('poll_questions', [])
        
        if not title:
            return Response(
                {'success': False, 'error': 'title gerekli'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Deadline varsa parse et
        if deadline:
            try:
                deadline = timezone.datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            except:
                deadline = None
        
        # Planned date varsa parse et
        if planned_date:
            try:
                planned_date = timezone.datetime.fromisoformat(planned_date.replace('Z', '+00:00'))
            except:
                planned_date = None
        
        # Maksimum 3 soru, boşları temizle
        if isinstance(poll_questions, list):
            clean_questions = [q.strip() for q in poll_questions if isinstance(q, str) and q.strip()]
            poll_questions = clean_questions[:3]
        else:
            poll_questions = []
        
        plan = GroupPlan.objects.create(
            creator=request.user,
            title=title,
            description=description,
            planned_date=planned_date,
            deadline=deadline,
            status='draft',
            poll_questions=poll_questions
        )
        
        # Oluşturucuyu otomatik katılımcı olarak ekle
        PlanParticipant.objects.create(
            plan=plan,
            user=request.user,
            is_invited=True,
            has_accepted=True
        )
        
        serializer = GroupPlanSerializer(plan)
        return Response({
            'success': True,
            'plan': serializer.data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_plan_detail_api(request, plan_id):
    """
    GET: Plan detayını getir
    PUT: Planı güncelle
    DELETE: Planı sil
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Sadece oluşturucu veya katılımcı görebilir
    is_creator = plan.creator == request.user
    is_participant = PlanParticipant.objects.filter(plan=plan, user=request.user).exists()
    
    if not (is_creator or is_participant):
        return Response(
            {'success': False, 'error': 'Bu plana erişim yetkiniz yok'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        serializer = GroupPlanSerializer(plan)
        return Response({
            'success': True,
            'plan': serializer.data
        })
    
    elif request.method == 'PUT':
        # Sadece oluşturucu güncelleyebilir
        if not is_creator:
            return Response(
                {'success': False, 'error': 'Sadece plan oluşturucusu güncelleyebilir'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        title = request.data.get('title', plan.title)
        description = request.data.get('description', plan.description)
        planned_date = request.data.get('planned_date', None)
        deadline = request.data.get('deadline', None)
        status_value = request.data.get('status', plan.status)
        poll_questions = request.data.get('poll_questions', None)
        
        plan.title = title
        plan.description = description
        plan.status = status_value
        
        if planned_date:
            try:
                plan.planned_date = timezone.datetime.fromisoformat(planned_date.replace('Z', '+00:00'))
            except:
                pass
        
        if deadline:
            try:
                plan.deadline = timezone.datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            except:
                pass
        
        # Sorular güncellendiyse temizle ve kaydet
        if isinstance(poll_questions, list):
            clean_questions = [q.strip() for q in poll_questions if isinstance(q, str) and q.strip()]
            plan.poll_questions = clean_questions[:3]
        
        plan.save()
        
        serializer = GroupPlanSerializer(plan)
        return Response({
            'success': True,
            'plan': serializer.data
        })
    
    elif request.method == 'DELETE':
        # Sadece oluşturucu silebilir
        if not is_creator:
            return Response(
                {'success': False, 'error': 'Sadece plan oluşturucusu silebilir'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        plan.delete()
        return Response({
            'success': True,
            'message': 'Plan silindi'
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_participants_api(request, plan_id):
    """
    Plana katılımcı davet et
    Body: { "user_ids": [1, 2, 3] }
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Sadece oluşturucu davet edebilir
    if plan.creator != request.user:
        return Response(
            {'success': False, 'error': 'Sadece plan oluşturucusu davet edebilir'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_ids = request.data.get('user_ids', [])
    if not user_ids or not isinstance(user_ids, list):
        return Response(
            {'success': False, 'error': 'user_ids listesi gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Sadece arkadaşları davet edebilir
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )
    
    friend_ids = []
    for friendship in friendships:
        if friendship.requester == request.user:
            friend_ids.append(friendship.receiver.id)
        else:
            friend_ids.append(friendship.requester.id)
    
    invited_users = []
    for user_id in user_ids:
        if user_id not in friend_ids:
            continue  # Arkadaş değilse atla
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            continue
        
        # Zaten katılımcı mı?
        participant, created = PlanParticipant.objects.get_or_create(
            plan=plan,
            user=user,
            defaults={'is_invited': True}
        )
        
        if created:
            invited_users.append(user.username)
    
    return Response({
        'success': True,
        'message': f'{len(invited_users)} kişi davet edildi',
        'invited_users': invited_users
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_invitation_api(request, plan_id):
    """
    Davete yanıt ver
    Body: { "action": "accept" | "decline" }
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
        participant = PlanParticipant.objects.get(plan=plan, user=request.user)
    except (GroupPlan.DoesNotExist, PlanParticipant.DoesNotExist):
        return Response(
            {'success': False, 'error': 'Plan veya davet bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    action = request.data.get('action')
    if action not in ['accept', 'decline']:
        return Response(
            {'success': False, 'error': 'action accept veya decline olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if action == 'accept':
        participant.has_accepted = True
        participant.has_declined = False
    else:
        participant.has_declined = True
        participant.has_accepted = False
    
    participant.responded_at = timezone.now()
    participant.save()
    
    return Response({
        'success': True,
        'message': f'Davet {action} edildi'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_place_api(request, plan_id):
    """
    Plan için mekan öner
    Body: { "place_id": 1, "suggestion_note": "..." }
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Katılımcı mı?
    is_participant = PlanParticipant.objects.filter(
        plan=plan,
        user=request.user,
        has_accepted=True
    ).exists()
    
    if not is_participant:
        return Response(
            {'success': False, 'error': 'Bu plana katılımcı değilsiniz'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    place_id = request.data.get('place_id')
    suggestion_note = request.data.get('suggestion_note', '')
    
    if not place_id:
        return Response(
            {'success': False, 'error': 'place_id gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Zaten önerilmiş mi?
    option, created = PlanPlaceOption.objects.get_or_create(
        plan=plan,
        place=place,
        defaults={
            'suggested_by': request.user,
            'suggestion_note': suggestion_note
        }
    )
    
    if not created:
        return Response(
            {'success': False, 'error': 'Bu mekan zaten önerilmiş'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = PlanPlaceOptionSerializer(option)
    return Response({
        'success': True,
        'option': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vote_place_api(request, plan_id):
    """
    Mekana oy ver
    Body: { "place_id": 1, "vote_type": "yes" | "maybe" | "no", "note": "..." }
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Oylama aktif mi?
    if not plan.is_voting_active:
        return Response(
            {'success': False, 'error': 'Oylama aktif değil'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Katılımcı mı?
    is_participant = PlanParticipant.objects.filter(
        plan=plan,
        user=request.user,
        has_accepted=True
    ).exists()
    
    if not is_participant:
        return Response(
            {'success': False, 'error': 'Bu plana katılımcı değilsiniz'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    place_id = request.data.get('place_id')
    vote_type = request.data.get('vote_type', 'yes')
    note = request.data.get('note', '')
    
    if not place_id:
        return Response(
            {'success': False, 'error': 'place_id gerekli'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if vote_type not in ['yes', 'maybe', 'no']:
        return Response(
            {'success': False, 'error': 'vote_type yes, maybe veya no olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
    except Place.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Mekan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Oy oluştur veya güncelle
    vote, created = PlanVote.objects.update_or_create(
        plan=plan,
        user=request.user,
        place=place,
        defaults={
            'vote_type': vote_type,
            'note': note
        }
    )
    
    serializer = PlanVoteSerializer(vote)
    return Response({
        'success': True,
        'vote': serializer.data,
        'created': created
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_poll_answers_api(request, plan_id):
    """
    Grup planı içindeki hızlı anket sorularına cevap kaydet.
    Body: { "answers": { "0": "Evet", "1": "23:00", "2": "Kadıköy" } }
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
        participant = PlanParticipant.objects.get(plan=plan, user=request.user)
    except (GroupPlan.DoesNotExist, PlanParticipant.DoesNotExist):
        return Response(
            {'success': False, 'error': 'Plan veya katılımcı bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    answers = request.data.get('answers', {})
    if not isinstance(answers, dict):
        return Response(
            {'success': False, 'error': 'answers alanı dict olmalı'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Sadece mevcut sorular için cevap al
    valid_answers = {}
    for idx, _ in enumerate(plan.poll_questions or []):
        key = str(idx)
        if key in answers and isinstance(answers[key], str):
            value = answers[key].strip()
            if value:
                valid_answers[key] = value
    
    participant.poll_answers = valid_answers
    participant.save()
    
    return Response({
        'success': True,
        'poll_answers': valid_answers
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_plan_api(request, plan_id):
    """
    Planı kesinleştir - En çok oy alan mekanı seç
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Sadece oluşturucu kesinleştirebilir
    if plan.creator != request.user:
        return Response(
            {'success': False, 'error': 'Sadece plan oluşturucusu kesinleştirebilir'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # En çok oy alan mekanı bul
    winner_place = plan.get_winner_place()
    
    if not winner_place:
        return Response(
            {'success': False, 'error': 'Henüz oy verilmemiş'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    plan.selected_place = winner_place
    plan.status = 'finalized'
    plan.save()
    
    serializer = GroupPlanSerializer(plan)
    return Response({
        'success': True,
        'plan': serializer.data,
        'winner_place': {
            'id': winner_place.id,
            'name': winner_place.name
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends_for_invite_api(request):
    """
    Davet için arkadaş listesini getir
    """
    friendships = Friendship.objects.filter(
        Q(requester=request.user, status='accepted') |
        Q(receiver=request.user, status='accepted')
    )
    
    friends = []
    for friendship in friendships:
        if friendship.requester == request.user:
            friend = friendship.receiver
        else:
            friend = friendship.requester
        
        friends.append({
            'id': friend.id,
            'username': friend.username,
            'display_name': friend.profile.get_display_name if hasattr(friend, 'profile') else friend.username
        })
    
    return Response({
        'success': True,
        'friends': friends,
        'count': len(friends)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_plan_ical(request, plan_id):
    """
    Planı iCal formatında export et
    """
    try:
        plan = GroupPlan.objects.get(id=plan_id)
    except GroupPlan.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Plan bulunamadı'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Erişim kontrolü
    is_creator = plan.creator == request.user
    is_participant = PlanParticipant.objects.filter(plan=plan, user=request.user).exists()
    
    if not (is_creator or is_participant):
        return Response(
            {'success': False, 'error': 'Bu plana erişim yetkiniz yok'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # iCal dosyası oluştur
    ical_content = generate_ical(plan)
    
    response = HttpResponse(ical_content, content_type='text/calendar; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="plan_{plan.id}.ics"'
    return response


def generate_ical(plan):
    """
    iCal formatında içerik oluştur
    """
    from datetime import datetime
    import uuid
    
    # Plan UID oluştur
    if not plan.ical_uid:
        plan.ical_uid = str(uuid.uuid4())
        plan.save()
    
    # Tarih formatı: YYYYMMDDTHHMMSS
    def format_datetime(dt):
        if not dt:
            return None
        return dt.strftime('%Y%m%dT%H%M%S')
    
    created = format_datetime(plan.created_at)
    start = format_datetime(plan.planned_date) if plan.planned_date else created
    end = format_datetime(plan.planned_date + timedelta(hours=2)) if plan.planned_date else None
    
    # iCal içeriği
    ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MekanKeşif//Grup Planlama//TR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        f'UID:{plan.ical_uid}',
        f'DTSTAMP:{created}',
    ]
    
    if start:
        ical.append(f'DTSTART:{start}')
    if end:
        ical.append(f'DTEND:{end}')
    
    ical.extend([
        f'SUMMARY:{plan.title}',
        f'DESCRIPTION:{plan.description or ""}',
        f'LOCATION:{plan.selected_place.address if plan.selected_place else ""}',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
    ])
    
    return '\r\n'.join(ical)
