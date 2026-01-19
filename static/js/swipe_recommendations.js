/**
 * Recommendations Swipe Page JavaScript
 * Based on swipe_modern.js but uses recommendations API
 */

class RecommendationsSwipeManager {
    constructor() {
        this.cards = [];
        this.currentIndex = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.currentCard = null;
        this.velocity = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.lastMoveX = 0;
        this.lastMoveY = 0;
        this.stats = {
            likes: 0,
            saves: 0
        };
        
        this.init();
    }
    
    init() {
        this.addBodyClass();
        this.setupGlobalOverlays();
        this.setupKeyboardControls();
        this.loadRecommendations();
    }
    
    addBodyClass() {
        document.body.classList.add('recommendations-page');
    }
    
    setupGlobalOverlays() {
        this.overlayLike = document.querySelector('.overlay-like');
        this.overlayNope = document.querySelector('.overlay-nope');
        this.overlaySave = document.querySelector('.overlay-save');
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.currentCard) return;
            
            switch(e.key) {
                case 'ArrowRight':
                case 'd':
                    e.preventDefault();
                    this.swipeCard('like');
                    break;
                case 'ArrowLeft':
                case 'a':
                    e.preventDefault();
                    this.swipeCard('dislike');
                    break;
                case 'ArrowUp':
                case 'w':
                    e.preventDefault();
                    this.swipeCard('save');
                    break;
                case 'ArrowDown':
                case 's':
                case 'Enter':
                    e.preventDefault();
                    this.showDetail();
                    break;
            }
        });
    }
    
    async loadRecommendations() {
        try {
            console.log('Loading recommendations...');
            // URL'deki query parametrelerini al
            const urlParams = new URLSearchParams(window.location.search);
            const params = new URLSearchParams();
            
            // Query parametrelerini API'ye aktar
            if (urlParams.get('category')) params.append('category', urlParams.get('category'));
            if (urlParams.get('atmosphere')) params.append('atmosphere', urlParams.get('atmosphere'));
            if (urlParams.get('context')) params.append('context', urlParams.get('context'));
            if (urlParams.get('price')) params.append('price', urlParams.get('price'));
            if (urlParams.get('taste_profile')) {
                // Taste profile kullanılıyorsa, query params gönderme (API kendi hesaplayacak)
            }
            
            params.append('limit', '20');
            
            const queryString = params.toString();
            const apiUrl = '/api/places/recommendations/' + (queryString ? '?' + queryString : '');
            
            console.log('Fetching from:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication required');
                    this.showError('Lütfen giriş yapın');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success && data.places && Array.isArray(data.places)) {
                if (data.places.length > 0) {
                    this.cards = data.places;
                    await this.renderCards();
                } else {
                    console.log('No recommendations found');
                    this.showEmptyState();
                }
            } else {
                console.error('Invalid response format:', data);
                this.showError('Geçersiz yanıt formatı');
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.showError('Öneriler yüklenirken bir hata oluştu: ' + error.message);
        }
    }
    
    async renderCards() {
        const stack = document.getElementById('cardsStack');
        stack.innerHTML = '';
        
        // Load all cards, but only show one at a time (TikTok style)
        if (this.cards.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Create all cards (absolute positioned, only active one visible)
        for (let i = 0; i < this.cards.length; i++) {
            const card = await this.createCard(this.cards[i], i);
            if (card && card instanceof Node) {
                // Absolute positioning, only first card active
                card.style.position = 'absolute';
                card.style.top = '0';
                card.style.left = '0';
                if (i === 0) {
                    card.classList.add('active');
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    card.style.zIndex = '10';
                    card.style.visibility = 'visible';
                    card.style.pointerEvents = 'auto';
                    this.currentCard = card;
                } else {
                    card.classList.remove('active');
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(100vh)';
                    card.style.zIndex = '1';
                    card.style.visibility = 'hidden';
                    card.style.pointerEvents = 'none';
                }
                
                stack.appendChild(card);
            }
        }
        
        // Hide legacy action buttons (reaction buttons are now in cards)
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
        
        // Update initial state
        this.updateCardCounter();
    }
    
    showNextCard() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        const cards = stack.querySelectorAll('.swipe-card');
        const currentCardEl = cards[this.currentIndex];
        const nextCardEl = cards[this.currentIndex + 1];
        
        if (!currentCardEl || !nextCardEl) return;
        
        // Animate current card out
        currentCardEl.classList.remove('active');
        currentCardEl.classList.add('prev');
        currentCardEl.style.opacity = '0';
        currentCardEl.style.transform = 'translateY(-100vh)';
        currentCardEl.style.zIndex = '1';
        currentCardEl.style.visibility = 'hidden';
        currentCardEl.style.pointerEvents = 'none';
        
        // Animate next card in
        nextCardEl.classList.remove('prev');
        nextCardEl.classList.add('active');
        nextCardEl.style.opacity = '1';
        nextCardEl.style.transform = 'translateY(0)';
        nextCardEl.style.zIndex = '10';
        nextCardEl.style.visibility = 'visible';
        nextCardEl.style.pointerEvents = 'auto';
        
        // Update references
        this.currentIndex++;
        this.currentCard = nextCardEl;
        this.updateCardCounter();
    }
    
    updateCardCounter() {
        const cardCounter = document.getElementById('cardCounter');
        const currentCardIndex = document.getElementById('currentCardIndex');
        const totalCards = document.getElementById('totalCards');
        
        if (cardCounter && this.cards.length > 0) {
            cardCounter.style.display = 'block';
            
            if (currentCardIndex) {
                currentCardIndex.textContent = this.currentIndex + 1;
            }
            if (totalCards) {
                totalCards.textContent = this.cards.length;
            }
        }
    }
    
    async createCard(place, index) {
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.dataset.placeId = place.id;
        card.dataset.index = index;
        
        // TikTok style: No stacking, full screen cards
        
        if (window.SwipeCardBuilder) {
            const builder = new window.SwipeCardBuilder();
            
            // Load taste profile and calculate matching
            let tasteProfile = null;
            let matchResult = null;
            
            try {
                tasteProfile = await builder.loadTasteProfile();
                if (tasteProfile) {
                    matchResult = builder.calculateTasteMatch(place, tasteProfile);
                }
            } catch (error) {
                console.error('Error loading taste profile:', error);
            }
            
            // Get photo info for banner
            const photos = place.photos || [];
            const photoIndex = 0;
            const totalPhotos = photos.length;
            
            // Build card content using DOM elements
            const cardContent = builder.buildCardContent(place, photoIndex, totalPhotos);
            card.appendChild(cardContent);
            
            // Add taste profile matching if available
            if (matchResult && matchResult.hasMatch) {
                const matchingHTML = builder.buildTasteProfileMatchingHTML(place, matchResult, tasteProfile);
                const contentSection = card.querySelector('.card-content');
                if (contentSection) {
                    contentSection.insertAdjacentHTML('afterbegin', matchingHTML);
                }
            }
            
            // Add recommendation badge (score 0-1 arası, yüzdeye çevir)
            if (place.score !== undefined && place.score !== null) {
                const badge = this.createRecommendationBadge(place.score);
                const contentSection = card.querySelector('.card-content');
                if (contentSection && badge) {
                    contentSection.insertBefore(badge, contentSection.firstChild);
                }
            }
            
            // Setup reaction buttons event listeners
            this.setupReactionButtons(card, place);
        } else {
            // Fallback
            card.innerHTML = this.buildCardHTML(place);
        }
        
        // Add interactive effects
        this.addCardInteractivity(card);
        
        return card;
    }
    
    createRecommendationBadge(score) {
        // Score 0-1 arası olmalı, yüzdeye çevir
        let scorePercent = 0;
        if (typeof score === 'number') {
            if (score <= 1.0) {
                scorePercent = Math.round(score * 100);
            } else if (score <= 100) {
                scorePercent = Math.round(score);
            } else {
                scorePercent = Math.min(100, Math.round(score / 100));
            }
        } else if (typeof score === 'string') {
            const scoreNum = parseFloat(score);
            if (!isNaN(scoreNum)) {
                scorePercent = scoreNum <= 1.0 ? Math.round(scoreNum * 100) : Math.round(scoreNum);
            }
        }
        
        scorePercent = Math.max(0, Math.min(100, scorePercent));
        
        // Score seviyesine göre bilgiler
        let scoreClass = 'score-medium';
        let scoreIcon = '⭐';
        let scoreLabel = 'İyi Eşleşme';
        let progressColor = '#667eea';
        
        if (scorePercent >= 85) {
            scoreClass = 'score-excellent';
            scoreIcon = '🏆';
            scoreLabel = 'Mükemmel Eşleşme';
            progressColor = '#38ef7d';
        } else if (scorePercent >= 70) {
            scoreClass = 'score-high';
            scoreIcon = '⭐';
            scoreLabel = 'Çok İyi Eşleşme';
            progressColor = '#60a5fa';
        } else if (scorePercent >= 50) {
            scoreClass = 'score-medium';
            scoreIcon = '👍';
            scoreLabel = 'İyi Eşleşme';
            progressColor = '#667eea';
        } else {
            scoreClass = 'score-low';
            scoreIcon = '💡';
            scoreLabel = 'Dene';
            progressColor = '#f59e0b';
        }
        
        const container = document.createElement('div');
        container.className = `recommendation-score-container ${scoreClass}`;
        
        const header = document.createElement('div');
        header.className = 'recommendation-score-header';
        
        const icon = document.createElement('div');
        icon.className = 'recommendation-score-icon';
        icon.textContent = scoreIcon;
        
        const info = document.createElement('div');
        info.className = 'recommendation-score-info';
        
        const label = document.createElement('div');
        label.className = 'recommendation-score-label';
        label.textContent = scoreLabel;
        
        const value = document.createElement('div');
        value.className = 'recommendation-score-value';
        value.textContent = `%${scorePercent}`;
        
        info.appendChild(label);
        info.appendChild(value);
        header.appendChild(icon);
        header.appendChild(info);
        
        const progress = document.createElement('div');
        progress.className = 'recommendation-score-progress';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'recommendation-score-progress-bar';
        progressBar.style.width = `${scorePercent}%`;
        progressBar.style.background = `linear-gradient(90deg, ${progressColor} 0%, ${progressColor}dd 100%)`;
        
        const progressFill = document.createElement('div');
        progressFill.className = 'recommendation-score-progress-fill';
        progressFill.style.width = `${scorePercent}%`;
        
        progress.appendChild(progressBar);
        progress.appendChild(progressFill);
        
        container.appendChild(header);
        container.appendChild(progress);
        
        return container;
    }
    
    setupReactionButtons(card, place) {
        const reactionButtons = card.querySelectorAll('.reaction-btn');
        reactionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                if (action) {
                    this.handleReaction(action, place);
                }
            });
        });
    }
    
    handleReaction(action, place) {
        switch(action) {
            case 'like':
                this.swipeCard('like', place);
                break;
            case 'dislike':
                this.swipeCard('dislike', place);
                break;
            case 'save':
                this.swipeCard('save', place);
                break;
            case 'detail':
                this.showDetail(place);
                break;
        }
    }
    
    addCardInteractivity(card) {
        // Add ripple effect on click
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
            
            const ripple = document.createElement('span');
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: rgba(217, 178, 78, 0.3);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
            `;
            
            card.style.position = 'relative';
            card.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
        
        // Add CSS for ripple animation if not exists
        if (!document.getElementById('ripple-animation-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(100);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    buildCardHTML(place) {
        const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
        const categories = place.categories || [];
        const tags = place.tags || [];
        const ratingStars = place.average_rating > 0 
            ? '★'.repeat(Math.floor(place.average_rating)) + '☆'.repeat(5 - Math.floor(place.average_rating))
            : '';
        
        // Score badge HTML (fallback için de aynı tasarım)
        let scoreBadgeHTML = '';
        if (place.score !== undefined && place.score !== null) {
            let scorePercent = 0;
            if (typeof place.score === 'number') {
                scorePercent = place.score <= 1.0 ? Math.round(place.score * 100) : Math.round(place.score);
            }
            scorePercent = Math.max(0, Math.min(100, scorePercent));
            
            let scoreClass = 'score-medium';
            let scoreIcon = '⭐';
            let scoreLabel = 'İyi Eşleşme';
            let progressColor = '#667eea';
            
            if (scorePercent >= 85) {
                scoreClass = 'score-excellent';
                scoreIcon = '🏆';
                scoreLabel = 'Mükemmel Eşleşme';
                progressColor = '#38ef7d';
            } else if (scorePercent >= 70) {
                scoreClass = 'score-high';
                scoreIcon = '⭐';
                scoreLabel = 'Çok İyi Eşleşme';
                progressColor = '#60a5fa';
            } else if (scorePercent >= 50) {
                scoreClass = 'score-medium';
                scoreIcon = '👍';
                scoreLabel = 'İyi Eşleşme';
                progressColor = '#667eea';
            } else {
                scoreClass = 'score-low';
                scoreIcon = '💡';
                scoreLabel = 'Dene';
                progressColor = '#f59e0b';
            }
            
            scoreBadgeHTML = `
                <div class="recommendation-score-container ${scoreClass}">
                    <div class="recommendation-score-header">
                        <div class="recommendation-score-icon">${scoreIcon}</div>
                        <div class="recommendation-score-info">
                            <div class="recommendation-score-label">${scoreLabel}</div>
                            <div class="recommendation-score-value">%${scorePercent}</div>
                        </div>
                    </div>
                    <div class="recommendation-score-progress">
                        <div class="recommendation-score-progress-bar" 
                             style="width: ${scorePercent}%; background: linear-gradient(90deg, ${progressColor} 0%, ${progressColor}dd 100%);"></div>
                        <div class="recommendation-score-progress-fill" 
                             style="width: ${scorePercent}%;"></div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="card-hero-section">
                ${photo ? `
                    <img src="${photo}" alt="${place.name}" class="card-hero-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                ` : ''}
                <div class="card-hero-image" style="background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%); display: ${photo ? 'none' : 'flex'}; align-items: center; justify-content: center;">
                    <i class="bi bi-image" style="font-size: 80px; color: #666;"></i>
                </div>
                <div class="card-hero-overlay"></div>
                <div class="card-header">
                    <h1 class="card-name">${this.escapeHtml(place.name)}</h1>
                    <div class="card-category">
                        ${categories.slice(0, 2).map(c => this.escapeHtml(c)).join(' • ')}
                        ${ratingStars ? ` • ${ratingStars}` : ''}
                    </div>
                    ${place.short_description ? `<p class="card-slogan">${this.escapeHtml(place.short_description)}</p>` : ''}
                </div>
            </div>
            <div class="card-content">
                ${scoreBadgeHTML}
                <div class="card-tags">
                    ${tags.slice(0, 6).map(tag => `<span class="card-tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupDrag() {
        // Disabled - only reaction buttons work now
        // Scroll/swipe disabled, users must click reaction buttons
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.currentCard.classList.add('swiping');
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const rect = this.currentCard.getBoundingClientRect();
        this.startX = clientX - rect.left - rect.width / 2;
        this.startY = clientY - rect.top - rect.height / 2;
        
        this.lastMoveTime = Date.now();
        this.lastMoveX = clientX;
        this.lastMoveY = clientY;
        this.velocity = { x: 0, y: 0 };
        
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging || !this.currentCard) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const now = Date.now();
        const deltaTime = now - this.lastMoveTime;
        
        if (deltaTime > 0) {
            this.velocity.x = (clientX - this.lastMoveX) / deltaTime * 16;
            this.velocity.y = (clientY - this.lastMoveY) / deltaTime * 16;
        }
        
        this.lastMoveTime = now;
        this.lastMoveX = clientX;
        this.lastMoveY = clientY;
        
        const rect = this.currentCard.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        this.currentX = clientX - centerX;
        this.currentY = clientY - centerY;
        
        const rotate = this.currentX * 0.1;
        this.currentCard.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotate}deg)`;
        
        this.updateOverlay();
        
        e.preventDefault();
    }
    
    updateOverlay() {
        if (!this.overlayLike || !this.overlayNope || !this.overlaySave) return;
        
        this.overlayLike.classList.remove('show');
        this.overlayNope.classList.remove('show');
        this.overlaySave.classList.remove('show');
        
        if (this.currentX > 100) {
            this.overlayLike.classList.add('show');
        } else if (this.currentX < -100) {
            this.overlayNope.classList.add('show');
        } else if (this.currentY < -100) {
            this.overlaySave.classList.add('show');
        }
    }
    
    endDrag() {
        if (!this.isDragging || !this.currentCard) return;
        
        this.isDragging = false;
        this.currentCard.classList.remove('swiping');
        
        const threshold = 100;
        const velocityThreshold = 0.5;
        let action = null;
        
        if (Math.abs(this.velocity.x) > velocityThreshold || Math.abs(this.velocity.y) > velocityThreshold) {
            if (Math.abs(this.velocity.x) > Math.abs(this.velocity.y)) {
                action = this.velocity.x > 0 ? 'like' : 'dislike';
            } else {
                action = this.velocity.y < 0 ? 'save' : null;
            }
        } else if (Math.abs(this.currentX) > threshold) {
            action = this.currentX > 0 ? 'like' : 'dislike';
        } else if (this.currentY < -threshold) {
            action = 'save';
        }
        
        if (action) {
            this.swipeCard(action);
        } else {
            this.snapBack();
        }
    }
    
    snapBack() {
        this.currentCard.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.4s ease';
        this.currentCard.style.transform = '';
        this.currentCard.style.opacity = '1';
        
        setTimeout(() => {
            if (this.currentCard) {
                this.currentCard.style.transition = '';
            }
        }, 400);
        
        this.hideOverlays();
    }
    
    swipeCard(action, place = null) {
        if (!this.currentCard) return;
        
        const placeId = this.currentCard.dataset.placeId;
        this.showOverlay(action);
        
        // Vibrate on action (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Update stats
        if (action === 'like') {
            this.stats.likes++;
        } else if (action === 'save') {
            this.stats.saves++;
        }
        this.updateStats();
        
        // Send action to backend
        this.sendSwipeAction(placeId, action);
        
        // Move to next card after action (like/dislike)
        if (action === 'like' || action === 'dislike') {
            setTimeout(() => {
                this.hideOverlays();
                if (this.currentIndex < this.cards.length - 1) {
                    this.showNextCard();
                } else {
                    // No more cards
                    this.showEmptyState();
                }
            }, 300);
        } else {
            setTimeout(() => {
                this.hideOverlays();
            }, 500);
        }
    }
    
    updateStats() {
        const likesCountEl = document.getElementById('likesCount');
        const savesCountEl = document.getElementById('savesCount');
        
        if (likesCountEl) {
            likesCountEl.textContent = this.stats.likes;
        }
        if (savesCountEl) {
            savesCountEl.textContent = this.stats.saves;
        }
    }
    
    showOverlay(action) {
        const overlayMap = {
            'like': this.overlayLike,
            'dislike': this.overlayNope,
            'save': this.overlaySave
        };
        
        const overlay = overlayMap[action];
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    hideOverlays() {
        [this.overlayLike, this.overlayNope, this.overlaySave].forEach(overlay => {
            if (overlay) overlay.classList.remove('show');
        });
    }
    
    async sendSwipeAction(placeId, action) {
        try {
            const response = await fetch('/api/places/discover/swipe/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    place_id: parseInt(placeId),
                    action: action,
                    timestamp: new Date().toISOString()
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`✓ ${action} action saved`);
            }
        } catch (error) {
            console.error('Error sending swipe action:', error);
        }
    }
    
    showDetail(place = null) {
        if (!this.currentCard && !place) return;
        
        const placeId = place ? place.id : this.currentCard.dataset.placeId;
        window.location.href = `/places/${placeId}/`;
    }
    
    nextCard() {
        // Alias for showNextCard
        this.showNextCard();
    }
    
    oldNextCard() {
        // Legacy method - kept for compatibility
        if (!this.currentCard) return;
        
        setTimeout(() => {
            this.hideOverlays();
            if (this.currentCard && this.currentCard.parentNode) {
                this.currentCard.remove();
            }
            this.currentIndex++;
            (async () => {
                await this.renderCards();
            })();
        }, 600);
    }
    
    showEmptyState() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        stack.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-lightbulb"></i></div>
                <h2>Öneri bulunamadı</h2>
                <p>Daha fazla öneri için filtreleri değiştirebilirsin</p>
                <a href="/places/recommendations/" class="empty-state-btn">
                    <i class="bi bi-arrow-left"></i> Öneriler Sayfasına Dön
                </a>
            </div>
        `;
        
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
    }
    
    showError(message = 'Bir hata oluştu') {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        stack.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-exclamation-triangle"></i></div>
                <h2>${this.escapeHtml(message)}</h2>
                <p>Lütfen sayfayı yenileyin veya tekrar deneyin</p>
                <a href="javascript:location.reload()" class="empty-state-btn" style="margin-top: 20px;">
                    <i class="bi bi-arrow-clockwise"></i> Sayfayı Yenile
                </a>
            </div>
        `;
        
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
    }
    
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize
function initRecommendationsSwipe() {
    if (document.body) {
        if (typeof SwipeCardBuilder !== 'undefined') {
            window.SwipeCardBuilder = SwipeCardBuilder;
        }
        
        window.recommendationsSwipeManager = new RecommendationsSwipeManager();
        
        window.swipeCard = (action, place = null) => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.swipeCard(action, place);
            }
        };
        
        window.showDetail = (place = null) => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.showDetail(place);
            }
        };
        
        window.nextCard = () => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.showNextCard();
            }
        };
    } else {
        document.addEventListener('DOMContentLoaded', initRecommendationsSwipe);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecommendationsSwipe);
} else {
    initRecommendationsSwipe();
}
