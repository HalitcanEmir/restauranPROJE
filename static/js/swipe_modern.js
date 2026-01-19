/**
 * Modern Swipe Page JavaScript
 * Enhanced with animations, interactivity and smooth transitions
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
        this.progressBar = null;
        this.cardObserver = null;
        this.stats = {
            likes: 0,
            saves: 0
        };
        
        this.init();
    }
    
    init() {
        this.addBodyClass();
        this.createProgressBar();
        this.setupGlobalOverlays();
        this.setupKeyboardControls();
        this.setupIntersectionObserver();
        this.loadPlaces();
    }
    
    addBodyClass() {
        document.body.classList.add('swipe-page');
    }
    
    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'swipe-progress-bar';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, #d4af37, #f5d76e);
            width: 0%;
            z-index: 9999;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        `;
        document.body.appendChild(progressBar);
        this.progressBar = progressBar;
    }
    
    updateProgress() {
        if (this.progressBar && this.cards.length > 0) {
            const progress = (this.currentIndex / this.cards.length) * 100;
            this.progressBar.style.width = `${progress}%`;
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
    
    setupGlobalOverlays() {
        this.overlayLike = document.querySelector('.overlay-like');
        this.overlayNope = document.querySelector('.overlay-nope');
        this.overlaySave = document.querySelector('.overlay-save');
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const stack = document.getElementById('cardsStack');
            if (!stack) return;
            
            // Prevent default on arrow keys
            if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
            }
            
            const currentScroll = stack.scrollTop;
            const cardHeight = window.innerHeight;
            const currentIndex = Math.round(currentScroll / cardHeight);
            
            switch(e.key) {
                case 'ArrowDown':
                case 's':
                    // Next card (scroll down)
                    if (currentIndex < this.cards.length - 1) {
                        const nextScroll = (currentIndex + 1) * cardHeight;
                        stack.scrollTo({ top: nextScroll, behavior: 'smooth' });
                    }
                    break;
                case 'ArrowUp':
                case 'w':
                    // Previous card (scroll up)
                    if (currentIndex > 0) {
                        const prevScroll = (currentIndex - 1) * cardHeight;
                        stack.scrollTo({ top: prevScroll, behavior: 'smooth' });
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                    // Like current card
                    if (this.currentCard) {
                        this.swipeCard('like');
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                    // Dislike current card
                    if (this.currentCard) {
                        this.swipeCard('dislike');
                    }
                    break;
                case 'Enter':
                case ' ':
                    // Show detail
                    e.preventDefault();
                    this.showDetail();
                    break;
            }
        });
    }
    
    setupIntersectionObserver() {
        // Observe cards for animations
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        
        this.cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('card-visible');
                    this.animateCardElements(entry.target);
                }
            });
        }, options);
    }
    
    animateCardElements(card) {
        // Animate tags
        const tags = card.querySelectorAll('.card-tag');
        tags.forEach((tag, index) => {
            setTimeout(() => {
                tag.style.opacity = '0';
                tag.style.transform = 'translateY(20px)';
                tag.style.transition = 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                
                requestAnimationFrame(() => {
                    tag.style.opacity = '1';
                    tag.style.transform = 'translateY(0)';
                });
            }, index * 100);
        });
        
        // Animate features
        const features = card.querySelectorAll('.card-feature');
        features.forEach((feature, index) => {
            setTimeout(() => {
                feature.style.opacity = '0';
                feature.style.transform = 'translateX(-20px)';
                feature.style.transition = 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                
                requestAnimationFrame(() => {
                    feature.style.opacity = '1';
                    feature.style.transform = 'translateX(0)';
                });
            }, (tags.length * 100) + (index * 80));
        });
        
        // Animate menu items
        const menuItems = card.querySelectorAll('.card-menu-item');
        menuItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.8)';
                item.style.transition = 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
                
                requestAnimationFrame(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                });
            }, (features.length * 80) + (index * 60));
        });
    }
    
    async loadPlaces() {
        try {
            // Show loading animation
            this.showLoadingAnimation();
            
            const response = await fetch('/api/places/discover/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showError('Lütfen giriş yapın');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.places && Array.isArray(data.places)) {
                if (data.places.length > 0) {
                    this.cards = data.places;
                    await this.renderCards();
                    this.updateProgress();
                    this.updateCardCounter();
                } else {
                    this.showEmptyState();
                }
            } else {
                this.showError('Geçersiz yanıt formatı');
            }
        } catch (error) {
            console.error('Error loading places:', error);
            this.showError('Mekanlar yüklenirken bir hata oluştu: ' + error.message);
        }
    }
    
    showLoadingAnimation() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        stack.innerHTML = `
            <div class="loading">
                <div class="spinner-border"></div>
                <p>Mekanlar yükleniyor...</p>
            </div>
        `;
    }
    
    async renderCards() {
        const stack = document.getElementById('cardsStack');
        stack.innerHTML = '';
        
        // TikTok style: Load all cards, vertical scroll
        if (this.cards.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Create all cards (TikTok style - full screen, vertical stack)
        for (let i = 0; i < this.cards.length; i++) {
            const card = await this.createCard(this.cards[i], i);
            if (card && card instanceof Node) {
                // Remove absolute positioning for vertical scroll
                card.style.position = 'relative';
                card.style.opacity = '1';
                card.style.transform = 'none';
                card.style.zIndex = 'auto';
                
                stack.appendChild(card);
                
                // Observe card for intersection (for lazy loading, animations, etc.)
                if (this.cardObserver) {
                    this.cardObserver.observe(card);
                }
            }
        }
        
        // Hide legacy action buttons (reaction buttons are now in cards)
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
        
        // Setup scroll-based interactions
        this.setupScrollSnap();
        this.setupScrollTracking();
    }
    
    setupScrollSnap() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        // Scroll snap is handled by CSS, but we can add smooth scroll behavior
        let isScrolling = false;
        
        stack.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                window.requestAnimationFrame(() => {
                    this.updateCurrentCardFromScroll();
                    isScrolling = false;
                });
            }
        });
    }
    
    updateCurrentCardFromScroll() {
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        const scrollTop = stack.scrollTop;
        const cardHeight = window.innerHeight;
        const currentIndex = Math.round(scrollTop / cardHeight);
        
        if (currentIndex !== this.currentIndex && currentIndex < this.cards.length) {
            this.currentIndex = currentIndex;
            this.updateCardCounter();
            this.updateProgress();
            
            // Update current card reference
            const cards = stack.querySelectorAll('.swipe-card');
            if (cards[currentIndex]) {
                this.currentCard = cards[currentIndex];
            }
        }
    }
    
    setupScrollTracking() {
        // Track which card is currently visible
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const card = entry.target;
                    const index = Array.from(stack.querySelectorAll('.swipe-card')).indexOf(card);
                    if (index !== -1) {
                        this.currentIndex = index;
                        this.currentCard = card;
                        this.updateCardCounter();
                        this.updateProgress();
                    }
                }
            });
        }, {
            root: stack,
            threshold: [0.5]
        });
        
        const cards = stack.querySelectorAll('.swipe-card');
        cards.forEach(card => observer.observe(card));
    }
    
    addParallaxEffect() {
        const heroImages = document.querySelectorAll('.card-hero-image');
        const cards = document.querySelectorAll('.swipe-card');
        
        cards.forEach((card, cardIndex) => {
            if (cardIndex !== 0) return; // Only for top card
            
            const heroImage = card.querySelector('.card-hero-image');
            if (!heroImage) return;
            
            let isHovering = false;
            
            card.addEventListener('mousemove', (e) => {
                if (!isHovering || this.isDragging) return;
                
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
                
                heroImage.style.transform = `scale(1.08) translate(${x}px, ${y}px)`;
            });
            
            card.addEventListener('mouseenter', () => {
                isHovering = true;
            });
            
            card.addEventListener('mouseleave', () => {
                isHovering = false;
                heroImage.style.transform = 'scale(1.05)';
            });
        });
    }
    
    async createCard(place, index) {
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.dataset.placeId = place.id;
        card.dataset.index = index;
        
        // TikTok style: No stacking, full screen cards
        
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
            
            // Get photo info for banner
            const photos = place.photos || [];
            const photoIndex = 0; // Start with first photo (can be extended for slider)
            const totalPhotos = photos.length;
            
            // Build card content using DOM elements (not innerHTML)
            const cardContent = builder.buildCardContent(place, photoIndex, totalPhotos);
            
            // Append content first to make querySelector work
            card.appendChild(cardContent);
            
            // Add taste profile matching if available
            if (matchResult && matchResult.hasMatch) {
                const matchingHTML = builder.buildTasteProfileMatchingHTML(place, matchResult, tasteProfile);
                const contentSection = card.querySelector('.card-content');
                if (contentSection) {
                    contentSection.insertAdjacentHTML('afterbegin', matchingHTML);
                }
            }
            
            // Setup reaction buttons event listeners
            this.setupReactionButtons(card, place);
        } else {
            // Fallback to simple card
            const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
            const categories = place.categories || [];
            const tags = place.tags || [];
            const features = place.featured_features || [];
            const hours = place.hours || {};
            card.innerHTML = this.buildCardHTML(place, photo, categories, tags, features, hours);
        }
        
        // Add interactive effects
        this.addCardInteractivity(card);
        
        return card;
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
        // Add glow effect on hover for buttons
        const buttons = card.querySelectorAll('a, button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.transition = 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
        });
        
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
                background: rgba(212, 175, 55, 0.3);
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
        // TikTok style: Vertical swipe support for mobile
        const stack = document.getElementById('cardsStack');
        if (!stack) return;
        
        let touchStartY = 0;
        let touchStartTime = 0;
        let isVerticalSwipe = false;
        
        stack.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isVerticalSwipe = false;
        }, { passive: true });
        
        stack.addEventListener('touchmove', (e) => {
            if (!touchStartY) return;
            
            const touchY = e.touches[0].clientY;
            const deltaY = touchY - touchStartY;
            
            // Detect vertical swipe
            if (Math.abs(deltaY) > 10) {
                isVerticalSwipe = true;
            }
        }, { passive: true });
        
        stack.addEventListener('touchend', (e) => {
            if (!touchStartY || !isVerticalSwipe) {
                touchStartY = 0;
                return;
            }
            
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;
            const velocity = Math.abs(deltaY / deltaTime);
            
            // Swipe threshold: 50px or fast swipe (velocity > 0.3)
            if (Math.abs(deltaY) > 50 || velocity > 0.3) {
                const stack = document.getElementById('cardsStack');
                const currentScroll = stack.scrollTop;
                const cardHeight = window.innerHeight;
                const currentIndex = Math.round(currentScroll / cardHeight);
                
                if (deltaY < 0 && currentIndex < this.cards.length - 1) {
                    // Swipe up - next card
                    const nextScroll = (currentIndex + 1) * cardHeight;
                    stack.scrollTo({ top: nextScroll, behavior: 'smooth' });
                } else if (deltaY > 0 && currentIndex > 0) {
                    // Swipe down - previous card
                    const prevScroll = (currentIndex - 1) * cardHeight;
                    stack.scrollTo({ top: prevScroll, behavior: 'smooth' });
                }
            }
            
            touchStartY = 0;
            isVerticalSwipe = false;
        }, { passive: true });
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
        
        // Enhanced rotation with smooth easing
        const rotate = this.currentX * 0.1;
        const scale = 1 - Math.abs(this.currentX) / window.innerWidth * 0.1;
        
        this.currentCard.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotate}deg) scale(${Math.max(0.95, scale)})`;
        
        // Update overlay opacity based on distance
        const distance = Math.abs(this.currentX);
        const opacity = Math.min(distance / 150, 1);
        
        this.updateOverlay(opacity);
        
        // Update next card position
        this.updateNextCard();
        
        e.preventDefault();
    }
    
    updateNextCard() {
        const nextCard = document.querySelector('.swipe-card:nth-child(2)');
        if (nextCard && this.currentCard) {
            const distance = Math.abs(this.currentX);
            const progress = Math.min(distance / 200, 1);
            
            const baseScale = 0.98;
            const baseTranslate = 20;
            
            nextCard.style.transform = `scale(${baseScale + progress * 0.02}) translateY(${baseTranslate - progress * 10}px)`;
            nextCard.style.opacity = 0.7 + progress * 0.3;
            nextCard.style.filter = `blur(${2 - progress * 2}px)`;
        }
    }
    
    updateOverlay(opacity = 1) {
        if (!this.overlayLike || !this.overlayNope || !this.overlaySave) return;
        
        this.overlayLike.classList.remove('show');
        this.overlayNope.classList.remove('show');
        this.overlaySave.classList.remove('show');
        
        if (this.currentX > 100) {
            this.overlayLike.classList.add('show');
            this.overlayLike.style.opacity = opacity;
        } else if (this.currentX < -100) {
            this.overlayNope.classList.add('show');
            this.overlayNope.style.opacity = opacity;
        } else if (this.currentY < -100) {
            this.overlaySave.classList.add('show');
            this.overlaySave.style.opacity = opacity;
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
        
        // Reset next card
        this.resetNextCard();
    }
    
    resetNextCard() {
        const nextCard = document.querySelector('.swipe-card:nth-child(2)');
        if (nextCard) {
            nextCard.style.transition = 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
            nextCard.style.transform = 'scale(0.98) translateY(20px)';
            nextCard.style.opacity = '0.7';
            nextCard.style.filter = 'blur(2px)';
        }
    }
    
    snapBack() {
        this.currentCard.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease';
        this.currentCard.style.transform = '';
        this.currentCard.style.opacity = '1';
        
        setTimeout(() => {
            if (this.currentCard) {
                this.currentCard.style.transition = '';
            }
        }, 500);
        
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
        
        // TikTok style: Scroll to next card after action
        const stack = document.getElementById('cardsStack');
        if (stack && (action === 'like' || action === 'dislike')) {
            const currentScroll = stack.scrollTop;
            const cardHeight = window.innerHeight;
            const currentIndex = Math.round(currentScroll / cardHeight);
            
            // Scroll to next card
            if (currentIndex < this.cards.length - 1) {
                const nextScroll = (currentIndex + 1) * cardHeight;
                stack.scrollTo({ top: nextScroll, behavior: 'smooth' });
            }
        }
        
        setTimeout(() => {
            this.hideOverlays();
            
            // Animate next card to top position
            const nextCard = document.querySelector('.swipe-card');
            if (nextCard) {
                nextCard.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                nextCard.style.transform = 'scale(1) translateY(0)';
                nextCard.style.opacity = '1';
                nextCard.style.filter = 'blur(0)';
                nextCard.style.zIndex = '5';
            }
            
            // Use async IIFE to await renderCards
            (async () => {
                await this.renderCards();
            })();
        }, 700);
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
            if (overlay) {
                overlay.classList.remove('show');
                overlay.style.opacity = '';
            }
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
        
        // Add exit animation
        topCard.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.4s ease';
        topCard.style.transform = 'scale(0.95)';
        topCard.style.opacity = '0.8';
        
        setTimeout(() => {
            window.location.href = `/places/${placeId}/`;
        }, 200);
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
