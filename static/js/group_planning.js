/**
 * Grup Planlama JavaScript
 * Plan listesi, oluşturma, oylama ve takvim entegrasyonu
 */

// Plan Listesi Yöneticisi
class GroupPlansManager {
    constructor() {
        this.container = document.getElementById('plansContainer');
    }

    async loadPlans() {
        try {
            const response = await fetch('/api/social/plans/', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Planlar yüklenemedi');
            }

            const data = await response.json();
            this.renderPlans(data.plans || []);
        } catch (error) {
            console.error('Error loading plans:', error);
            this.container.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Planlar yüklenirken bir hata oluştu.</p>
                </div>
            `;
        }
    }

    renderPlans(plans) {
        if (plans.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-x"></i>
                    <p>Henüz plan oluşturmadınız.</p>
                    <a href="/social/plans/create/" class="btn btn-primary">İlk Planınızı Oluşturun</a>
                </div>
            `;
            return;
        }

        this.container.innerHTML = plans.map(plan => `
            <div class="plan-card" onclick="window.location.href='/social/plans/${plan.id}/'">
                <div class="plan-card-header">
                    <h3 class="plan-card-title">${this.escapeHtml(plan.title)}</h3>
                    <span class="plan-status-badge status-${plan.status}">
                        ${this.getStatusText(plan.status)}
                    </span>
                </div>
                <div class="plan-card-meta">
                    <i class="bi bi-person"></i> ${plan.creator_username} |
                    <i class="bi bi-people"></i> ${plan.total_participants} katılımcı |
                    <i class="bi bi-bar-chart"></i> ${plan.total_votes} oy
                </div>
                ${plan.description ? `<p>${this.escapeHtml(plan.description)}</p>` : ''}
                <div class="plan-card-footer">
                    <span class="text-muted">${this.formatDate(plan.created_at)}</span>
                    ${plan.selected_place_name ? 
                        `<span class="badge bg-success">${plan.selected_place_name}</span>` : 
                        '<span class="badge bg-secondary">Oylama devam ediyor</span>'
                    }
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'draft': 'Taslak',
            'voting': 'Oylama',
            'finalized': 'Kesinleşti',
            'cancelled': 'İptal'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Plan Oluşturucu
class GroupPlanCreator {
    constructor() {
        this.form = document.getElementById('createPlanForm');
        this.friendsList = document.getElementById('friendsList');
        this.selectedFriends = new Set();
    }

    async init() {
        await this.loadFriends();
        this.setupForm();
    }

    async loadFriends() {
        try {
            const response = await fetch('/api/social/friends/for-invite/', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Arkadaşlar yüklenemedi');
            }

            const data = await response.json();
            this.renderFriends(data.friends || []);
        } catch (error) {
            console.error('Error loading friends:', error);
            this.friendsList.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Arkadaşlar yüklenirken bir hata oluştu.</p>
                </div>
            `;
        }
    }

    renderFriends(friends) {
        if (friends.length === 0) {
            this.friendsList.innerHTML = `
                <div class="empty-state">
                    <p>Henüz arkadaşınız yok. Arkadaş ekleyerek başlayın!</p>
                </div>
            `;
            return;
        }

        this.friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item">
                <label>
                    <input type="checkbox" value="${friend.id}" 
                           onchange="groupPlanCreator.toggleFriend(${friend.id})">
                    <span>${this.escapeHtml(friend.display_name || friend.username)}</span>
                </label>
            </div>
        `).join('');
    }

    toggleFriend(userId) {
        if (this.selectedFriends.has(userId)) {
            this.selectedFriends.delete(userId);
        } else {
            this.selectedFriends.add(userId);
        }
    }

    setupForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createPlan();
        });
    }

    async createPlan() {
        const formData = new FormData(this.form);
        const data = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            planned_date: formData.get('planned_date') || null,
            deadline: formData.get('deadline') || null
        };

        try {
            const response = await fetch('/api/social/plans/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Plan oluşturulamadı');
            }

            const result = await response.json();
            const planId = result.plan.id;

            // Arkadaşları davet et
            if (this.selectedFriends.size > 0) {
                await this.inviteFriends(planId);
            }

            // Plan detay sayfasına yönlendir
            window.location.href = `/social/plans/${planId}/`;
        } catch (error) {
            console.error('Error creating plan:', error);
            alert('Plan oluşturulurken bir hata oluştu: ' + error.message);
        }
    }

    async inviteFriends(planId) {
        const response = await fetch(`/api/social/plans/${planId}/invite/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                user_ids: Array.from(this.selectedFriends)
            })
        });

        if (!response.ok) {
            console.error('Error inviting friends');
        }
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Plan Detay Yöneticisi
class GroupPlanDetail {
    constructor(planId, isCreator) {
        this.planId = planId;
        this.isCreator = isCreator;
        this.selectedPlaceId = null;
    }

    async init() {
        await this.loadPlan();
        this.setupEventListeners();
    }

    async loadPlan() {
        try {
            const response = await fetch(`/api/social/plans/${this.planId}/`, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Plan yüklenemedi');
            }

            const data = await response.json();
            this.renderPlan(data.plan);
        } catch (error) {
            console.error('Error loading plan:', error);
            alert('Plan yüklenirken bir hata oluştu.');
        }
    }

    renderPlan(plan) {
        this.renderPlaceOptions(plan.place_options || []);
        this.renderVotes(plan.votes || []);
        this.renderParticipants(plan.participants || []);
    }

    renderPlaceOptions(options) {
        const container = document.getElementById('placeOptions');
        if (options.length === 0) {
            container.innerHTML = '<p class="text-muted">Henüz mekan önerilmemiş.</p>';
            return;
        }

        container.innerHTML = options.map(option => `
            <div class="place-option-card">
                <div class="place-option-header">
                    <div>
                        <h4 class="place-option-name">${this.escapeHtml(option.place_data.name)}</h4>
                        <p class="text-muted">${this.escapeHtml(option.place_data.address || '')}</p>
                        <p><strong>${option.vote_count}</strong> oy</p>
                    </div>
                    <div class="vote-buttons">
                        <button class="vote-btn" onclick="groupPlanDetail.vote(${option.place}, 'yes')">
                            <i class="bi bi-hand-thumbs-up"></i> Evet
                        </button>
                        <button class="vote-btn" onclick="groupPlanDetail.vote(${option.place}, 'maybe')">
                            <i class="bi bi-question-circle"></i> Belki
                        </button>
                        <button class="vote-btn" onclick="groupPlanDetail.vote(${option.place}, 'no')">
                            <i class="bi bi-hand-thumbs-down"></i> Hayır
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderVotes(votes) {
        const container = document.getElementById('votesList');
        if (votes.length === 0) {
            container.innerHTML = '<p class="text-muted">Henüz oy verilmemiş.</p>';
            return;
        }

        container.innerHTML = votes.map(vote => `
            <div class="vote-item">
                <div>
                    <strong>${this.escapeHtml(vote.username)}</strong> - 
                    ${this.escapeHtml(vote.place_name)}
                </div>
                <span class="badge">${this.getVoteTypeText(vote.vote_type)}</span>
            </div>
        `).join('');
    }

    renderParticipants(participants) {
        const container = document.getElementById('participantsList');
        container.innerHTML = participants.map(p => `
            <div class="participant-item">
                <span>${this.escapeHtml(p.username)}</span>
                ${p.has_accepted ? 
                    '<span class="badge bg-success">Kabul</span>' : 
                    p.has_declined ? 
                    '<span class="badge bg-danger">Red</span>' : 
                    '<span class="badge bg-warning">Beklemede</span>'
                }
            </div>
        `).join('');
    }

    async vote(placeId, voteType) {
        try {
            const response = await fetch(`/api/social/plans/${this.planId}/vote/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    place_id: placeId,
                    vote_type: voteType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Oy verilemedi');
            }

            // Planı yeniden yükle
            await this.loadPlan();
        } catch (error) {
            console.error('Error voting:', error);
            alert('Oy verilirken bir hata oluştu: ' + error.message);
        }
    }

    getVoteTypeText(type) {
        const typeMap = {
            'yes': 'Evet',
            'maybe': 'Belki',
            'no': 'Hayır'
        };
        return typeMap[type] || type;
    }

    setupEventListeners() {
        // Event listeners buraya eklenebilir
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global fonksiyonlar
window.groupPlanCreator = null;
window.groupPlanDetail = null;

// Plan kesinleştir
async function finalizePlan(planId) {
    if (!confirm('Planı kesinleştirmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`/api/social/plans/${planId}/finalize/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Plan kesinleştirilemedi');
        }

        alert('Plan kesinleştirildi!');
        location.reload();
    } catch (error) {
        console.error('Error finalizing plan:', error);
        alert('Plan kesinleştirilirken bir hata oluştu: ' + error.message);
    }
}

// Takvime ekle
function exportToCalendar(planId) {
    // iCal export için endpoint'e yönlendir
    window.location.href = `/api/social/plans/${planId}/export-ical/`;
}

// Mekan öner modal
function suggestPlace() {
    document.getElementById('suggestPlaceModal').classList.add('show');
}

function closeSuggestModal() {
    document.getElementById('suggestPlaceModal').classList.remove('show');
}

async function submitPlaceSuggestion() {
    // Place suggestion logic buraya eklenecek
    alert('Mekan önerisi özelliği yakında eklenecek!');
}
