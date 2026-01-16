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
        
        const cardsToShow = this.cards.slice(this.currentIndex, this.currentIndex + 3);
        
        if (cardsToShow.length === 0) {
            this.showEmptyState();
            return;
        }
        
        for (let i = 0; i < cardsToShow.length; i++) {
            const card = await this.createCard(cardsToShow[i], i);
            if (card && card instanceof Node) {
                stack.appendChild(card);
            }
        }
        
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'flex';
        }
        this.setupDrag();
    }
    
    async createCard(place, index) {
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.dataset.placeId = place.id;
        card.style.zIndex = 5 - index;
        
        if (index > 0) {
            card.style.transform = `scale(${1 - index * 0.02}) translateY(${index * 20}px)`;
            card.style.opacity = 1 - index * 0.3;
        }
        
        if (window.SwipeCardBuilder) {
            const builder = new window.SwipeCardBuilder();
            
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
            
            let cardHTML = builder.buildCardHTML(place);
            
            if (matchResult && matchResult.hasMatch) {
                const matchingHTML = builder.buildTasteProfileMatchingHTML(place, matchResult, tasteProfile);
                cardHTML = cardHTML.replace(
                    '<div class="card-content">',
                    `<div class="card-content">${matchingHTML}`
                );
            }
            
            // Add recommendation badge (score 0-1 arası, yüzdeye çevir)
            if (place.score !== undefined && place.score !== null) {
                // Score 0-1 arası olmalı, yüzdeye çevir
                let scorePercent = 0;
                if (typeof place.score === 'number') {
                    if (place.score <= 1.0) {
                        scorePercent = Math.round(place.score * 100);
                    } else if (place.score <= 100) {
                        scorePercent = Math.round(place.score);
                    } else {
                        scorePercent = Math.min(100, Math.round(place.score / 100));
                    }
                } else if (typeof place.score === 'string') {
                    const scoreNum = parseFloat(place.score);
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
                
                const badgeHTML = `
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
                cardHTML = cardHTML.replace(
                    '<div class="card-content">',
                    `<div class="card-content">${badgeHTML}`
                );
            }
            
            card.innerHTML = cardHTML;
        } else {
            // Fallback
            card.innerHTML = this.buildCardHTML(place);
        }
        
        return card;
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
        const topCard = document.querySelector('.swipe-card');
        if (!topCard) return;
        
        this.currentCard = topCard;
        
        topCard.addEventListener('mousedown', (e) => this.startDrag(e));
        topCard.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchend', () => this.endDrag());
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
    
    swipeCard(action) {
        if (!this.currentCard) return;
        
        const placeId = this.currentCard.dataset.placeId;
        this.showOverlay(action);
        
        let translateX = 0;
        let translateY = 0;
        let rotate = 0;
        
        if (action === 'like') {
            translateX = window.innerWidth + 300;
            rotate = 30;
        } else if (action === 'dislike') {
            translateX = -window.innerWidth - 300;
            rotate = -30;
        } else if (action === 'save') {
            translateY = -window.innerHeight - 300;
        }
        
        this.currentCard.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.6s ease';
        this.currentCard.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(0.7)`;
        this.currentCard.style.opacity = '0';
        
        this.sendSwipeAction(placeId, action);
        
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
    
    showDetail() {
        const topCard = document.querySelector('.swipe-card');
        if (!topCard) return;
        
        const placeId = topCard.dataset.placeId;
        window.location.href = `/places/${placeId}/`;
    }
    
    nextCard() {
        // Bir sonraki kartı göster (mevcut kartı dislike gibi işle ama action kaydetme)
        if (!this.currentCard) return;
        
        const translateX = -window.innerWidth - 300;
        const rotate = -30;
        
        this.currentCard.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.6s ease';
        this.currentCard.style.transform = `translate(${translateX}px, 0) rotate(${rotate}deg) scale(0.7)`;
        this.currentCard.style.opacity = '0';
        
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
        
        window.swipeCard = (action) => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.swipeCard(action);
            }
        };
        
        window.showDetail = () => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.showDetail();
            }
        };
        
        window.nextCard = () => {
            if (window.recommendationsSwipeManager) {
                window.recommendationsSwipeManager.nextCard();
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
