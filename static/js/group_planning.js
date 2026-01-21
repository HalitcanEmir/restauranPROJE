/**
 * Grup Planlama JavaScript
 * Plan listesi, oluşturma, oylama ve takvim entegrasyonu
 */

// Plan Listesi Yöneticisi
class GroupPlansManager {
    constructor() {
        this.listContainer = document.getElementById('plansList');
        this.emptyState = document.getElementById('plansEmptyState');
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
            if (this.listContainer) {
                this.listContainer.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Planlar yüklenirken bir hata oluştu.</p>
                </div>
            `;
            }
        }
    }

    renderPlans(plans) {
        if (!this.listContainer) return;

        if (plans.length === 0) {
            this.listContainer.innerHTML = `
                <div class="empty-state" style="padding: 1.5rem; text-align: center;">
                    <i class="bi bi-chat-dots" style="font-size: 2rem;"></i>
                    <p class="mt-2 mb-1">Henüz hiç grubun yok.</p>
                    <a href="/social/plans/create/" class="btn btn-sm btn-primary">İlk Grubunu Oluştur</a>
                </div>
            `;
            if (this.emptyState) {
                this.emptyState.querySelector('p').textContent = 'Sağda detay görmek için önce bir grup oluşturmalısın.';
            }
            return;
        }

        this.listContainer.innerHTML = plans.map(plan => `
            <div class="plans-list-item" onclick="window.location.href='/social/plans/${plan.id}/'">
                <div class="plans-list-item-title">
                    ${this.escapeHtml(plan.title)}
                </div>
                <div class="plans-list-item-meta">
                    <span>${this.escapeHtml(this.getStatusText(plan.status))}</span>
                    <span>${this.formatDate(plan.created_at)}</span>
                </div>
            </div>
        `).join('');

        if (this.emptyState) {
            this.emptyState.querySelector('p').textContent = 'Bir grup seçtiğinde detayları burada göreceksin.';
        }
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
        this.selectedFriendsList = document.getElementById('selectedFriendsList');
        this.selectedFriendsSection = document.getElementById('selectedFriendsSection');
        this.selectedCount = document.getElementById('selectedCount');
        this.selectedFriends = new Set();
        this.allFriends = [];
        this.filteredFriends = [];
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
            this.allFriends = data.friends || [];
            this.filteredFriends = [...this.allFriends];
            this.renderFriends(this.filteredFriends);
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

    filterFriends(query) {
        const searchTerm = query.toLowerCase().trim();
        if (searchTerm === '') {
            this.filteredFriends = [...this.allFriends];
        } else {
            this.filteredFriends = this.allFriends.filter(friend => {
                const username = (friend.username || '').toLowerCase();
                const displayName = (friend.display_name || '').toLowerCase();
                return username.includes(searchTerm) || displayName.includes(searchTerm);
            });
        }
        this.renderFriends(this.filteredFriends);
    }

    renderFriends(friends) {
        if (friends.length === 0) {
            this.friendsList.innerHTML = `
                <div class="empty-state">
                    <p>Arkadaş bulunamadı.</p>
                </div>
            `;
            return;
        }

        this.friendsList.innerHTML = friends.map(friend => {
            const isSelected = this.selectedFriends.has(friend.id);
            const displayName = friend.display_name || friend.username;
            const escapedDisplayName = this.escapeHtml(displayName);
            const escapedUsername = this.escapeHtml(friend.username);
            
            return `
                <div class="friend-item ${isSelected ? 'selected' : ''}" 
                     data-user-id="${friend.id}">
                    <div class="friend-info">
                        <strong>${escapedDisplayName}</strong>
                        <span class="friend-username">@${escapedUsername}</span>
                    </div>
                    ${isSelected ? 
                        '<span class="added-badge"><i class="bi bi-check-circle"></i> Eklendi</span>' : 
                        `<button class="add-friend-btn" 
                                onclick="groupPlanCreator.addFriend(${friend.id}, '${escapedDisplayName.replace(/'/g, "\\'")}', '${escapedUsername.replace(/'/g, "\\'")}')">
                            <i class="bi bi-plus-circle"></i> Ekle
                        </button>`
                    }
                </div>
            `;
        }).join('');
    }

    addFriend(userId, displayName, username) {
        if (this.selectedFriends.has(userId)) {
            return;
        }
        
        this.selectedFriends.add(userId);
        this.updateSelectedFriendsList();
        this.renderFriends(this.filteredFriends);
    }

    removeFriend(userId) {
        this.selectedFriends.delete(userId);
        this.updateSelectedFriendsList();
        this.renderFriends(this.filteredFriends);
    }

    updateSelectedFriendsList() {
        const count = this.selectedFriends.size;
        this.selectedCount.textContent = count;
        
        if (count === 0) {
            this.selectedFriendsSection.style.display = 'none';
            return;
        }
        
        this.selectedFriendsSection.style.display = 'block';
        
        const selectedFriendsData = this.allFriends.filter(f => this.selectedFriends.has(f.id));
        this.selectedFriendsList.innerHTML = selectedFriendsData.map(friend => {
            const displayName = friend.display_name || friend.username;
            return `
                <div class="selected-friend-item">
                    <span>${this.escapeHtml(displayName)}</span>
                    <button class="remove-friend-btn" onclick="groupPlanCreator.removeFriend(${friend.id})">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            `;
        }).join('');
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
        if (this.selectedFriends.size === 0) {
            alert('Lütfen gruba en az bir arkadaş ekleyin.');
            return;
        }

        const now = new Date();
        const defaultTitle = `Grup - ${now.toLocaleDateString('tr-TR')}`;

        const data = {
            title: defaultTitle,
            description: '',
            planned_date: null,
            deadline: null,
            poll_questions: []
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
        this.renderPoll(plan.poll_questions || [], plan.participants || []);
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

    renderPoll(questions, participants) {
        const section = document.getElementById('pollSection');
        const container = document.getElementById('pollQuestions');
        const resultsContainer = document.getElementById('pollResults');

        if (!section || !container || !resultsContainer) return;

        if (!questions || questions.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        // Cevap formu
        container.innerHTML = questions.map((q, index) => `
            <div class="form-group">
                <label>${this.escapeHtml(q)}</label>
                <input type="text" class="form-control poll-answer-input" data-question-index="${index}" placeholder="Cevabın">
            </div>
        `).join('');

        // Mevcut katılımcı cevaplarından özet çıkar
        const summary = {};
        questions.forEach((q, idx) => {
            summary[idx] = {};
        });

        participants.forEach(p => {
            if (!p.poll_answers) return;
            Object.entries(p.poll_answers).forEach(([key, value]) => {
                if (!summary[key]) summary[key] = {};
                const v = value || '';
                if (!summary[key][v]) summary[key][v] = 0;
                summary[key][v] += 1;
            });
        });

        resultsContainer.innerHTML = questions.map((q, idx) => {
            const answers = summary[idx] || {};
            const items = Object.entries(answers);
            if (items.length === 0) {
                return `
                    <div class="poll-result-item">
                        <strong>${this.escapeHtml(q)}</strong>
                        <p class="text-muted">Henüz cevap yok.</p>
                    </div>
                `;
            }

            const answersHtml = items.map(([answer, count]) => `
                <div class="poll-answer-row">
                    <span>${this.escapeHtml(answer)}</span>
                    <span class="badge bg-primary">${count}</span>
                </div>
            `).join('');

            return `
                <div class="poll-result-item">
                    <strong>${this.escapeHtml(q)}</strong>
                    <div class="poll-answer-list">
                        ${answersHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Kaydet butonu bağla
        const saveButton = document.getElementById('savePollAnswersBtn');
        if (saveButton) {
            saveButton.onclick = () => this.savePollAnswers(questions.length);
        }
    }

    async savePollAnswers(questionCount) {
        const inputs = document.querySelectorAll('.poll-answer-input');
        const answers = {};

        inputs.forEach(input => {
            const idx = input.dataset.questionIndex;
            const value = (input.value || '').trim();
            if (value) {
                answers[idx] = value;
            }
        });

        try {
            const response = await fetch(`/api/social/plans/${this.planId}/poll/answers/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ answers })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Cevaplar kaydedilemedi');
            }

            alert('Cevapların kaydedildi!');
            await this.loadPlan();
        } catch (error) {
            console.error('Error saving poll answers:', error);
            alert('Cevaplar kaydedilirken bir hata oluştu: ' + error.message);
        }
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
