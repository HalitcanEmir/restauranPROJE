/**
 * Modern Swipe Page JavaScript
 * Advanced animations and interactions
 */

class SwipeManager {
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
        // Load places immediately without loading state
        this.loadPlaces();
    }
    
    addBodyClass() {
        document.body.classList.add('swipe-page');
    }
    
    setupGlobalOverlays() {
        // Overlays are already in HTML, just cache references
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
    
    async loadPlaces() {
        try {
            console.log('Loading places...');
            const response = await fetch('/api/places/discover/', {
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
                    console.log('No places found');
                    this.showEmptyState();
                }
            } else {
                console.error('Invalid response format:', data);
                this.showError('Geçersiz yanıt formatı');
            }
        } catch (error) {
            console.error('Error loading places:', error);
            this.showError('Mekanlar yüklenirken bir hata oluştu: ' + error.message);
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
        
        // Create cards asynchronously and wait for each one
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
        
        // Initial transform for stack effect
        if (index > 0) {
            card.style.transform = `scale(${1 - index * 0.02}) translateY(${index * 20}px)`;
            card.style.opacity = 1 - index * 0.3;
        }
        
        // Use SwipeCardBuilder for rich card content
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
            
            // Build card HTML
            let cardHTML = builder.buildCardHTML(place);
            
            // Add taste profile matching if available
            if (matchResult && matchResult.hasMatch) {
                const matchingHTML = builder.buildTasteProfileMatchingHTML(place, matchResult, tasteProfile);
                // Insert after card-content opening tag
                cardHTML = cardHTML.replace(
                    '<div class="card-content">',
                    `<div class="card-content">${matchingHTML}`
                );
            }
            
            card.innerHTML = cardHTML;
        } else {
            // Fallback to simple card
            const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
            const categories = place.categories || [];
            const tags = place.tags || [];
            const features = place.featured_features || [];
            const hours = place.hours || {};
            card.innerHTML = this.buildCardHTML(place, photo, categories, tags, features, hours);
        }
        
        return card;
    }
    
    buildCardHTML(place, photo, categories, tags, features, hours) {
        // Use SwipeCardBuilder for rich card content
        if (window.SwipeCardBuilder) {
            const builder = new window.SwipeCardBuilder();
            return builder.buildCardHTML(place);
        }
        
        // Fallback to simple card if builder not loaded
        const ratingStars = place.average_rating > 0 
            ? '★'.repeat(Math.floor(place.average_rating)) + '☆'.repeat(5 - Math.floor(place.average_rating))
            : '';
        
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
                <div class="card-tags">
                    ${tags.slice(0, 4).map(tag => `<span class="card-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    ${features.slice(0, 2).map(f => `<span class="card-tag">${this.escapeHtml(f)}</span>`).join('')}
                </div>
                <div class="card-features">
                    ${features.slice(0, 4).map(f => `
                        <div class="card-feature">
                            <div class="card-feature-icon"><i class="bi bi-check-circle-fill"></i></div>
                            <div class="card-feature-text">
                                <div class="card-feature-title">${this.escapeHtml(f)}</div>
                            </div>
                        </div>
                    `).join('')}
                    ${place.city ? `
                        <div class="card-feature">
                            <div class="card-feature-icon"><i class="bi bi-geo-alt-fill"></i></div>
                            <div class="card-feature-text">
                                <div class="card-feature-title">Konum</div>
                                <div class="card-feature-desc">${this.escapeHtml(place.city)}${place.address ? ', ' + this.escapeHtml(place.address.substring(0, 50)) : ''}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="card-menu">
                    <div class="card-menu-title">Menü & Fiyatlar</div>
                    <div class="card-menu-items">
                        ${categories.slice(0, 4).map(cat => `
                            <div class="card-menu-item">
                                <div class="card-menu-item-name">${this.escapeHtml(cat)}</div>
                                <div class="card-menu-item-price">${place.price_level || '₺₺'}+</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${Object.keys(hours).length > 0 ? `
                    <div class="card-features" style="margin-top: 25px;">
                        <div class="card-feature">
                            <div class="card-feature-icon"><i class="bi bi-clock"></i></div>
                            <div class="card-feature-text">
                                <div class="card-feature-title">Çalışma Saatleri</div>
                                <div class="card-feature-desc">
                                    ${Object.entries(hours).slice(0, 5).map(([day, time]) => 
                                        `<strong>${this.escapeHtml(day)}:</strong> ${this.escapeHtml(time)}`
                                    ).join('<br>')}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                ${place.menu_link ? `
                    <div style="margin-top: 25px; text-align: center;">
                        <a href="${this.escapeHtml(place.menu_link)}" target="_blank" class="menu-link-btn">
                            <i class="bi bi-menu-button-wide"></i> Menüyü Görüntüle
                        </a>
                    </div>
                ` : ''}
                ${place.average_rating > 0 ? `
                    <div class="card-features" style="margin-top: 25px;">
                        <div class="card-feature">
                            <div class="card-feature-icon"><i class="bi bi-star-fill" style="color: var(--accent);"></i></div>
                            <div class="card-feature-text">
                                <div class="card-feature-title">Değerlendirme</div>
                                <div class="card-feature-desc" style="font-size: 16px; margin-top: 5px;">
                                    <span style="color: var(--accent); font-size: 20px;">${ratingStars}</span>
                                    <span style="margin-left: 10px; font-weight: bold;">${place.average_rating.toFixed(1)} / 5.0</span>
                                    <span style="margin-left: 10px; color: var(--text-muted);">(${place.total_visits || 0} değerlendirme)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
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
        
        // Check velocity for quick swipes
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
            // Use async IIFE to await renderCards
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
    
    showEmptyState() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        stack.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-check-circle-fill"></i></div>
                <h2>Tüm mekanları gördün!</h2>
                <p>Daha fazla mekan için filtreleri değiştirebilirsin</p>
                <a href="/discover/" class="empty-state-btn">
                    <i class="bi bi-compass"></i> Keşfet Sayfasına Dön
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

// Initialize immediately or when DOM is ready
function initSwipeManager() {
    if (document.body) {
        // Make SwipeCardBuilder available globally
        if (typeof SwipeCardBuilder !== 'undefined') {
            window.SwipeCardBuilder = SwipeCardBuilder;
        }
        
        window.swipeManager = new SwipeManager();
        
        // Global functions for button clicks
        window.swipeCard = (action) => {
            if (window.swipeManager) {
                window.swipeManager.swipeCard(action);
            }
        };
        
        window.showDetail = () => {
            if (window.swipeManager) {
                window.swipeManager.showDetail();
            }
        };
    } else {
        // Wait for DOM
        document.addEventListener('DOMContentLoaded', initSwipeManager);
    }
}

// Try to initialize immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwipeManager);
} else {
    initSwipeManager();
}
