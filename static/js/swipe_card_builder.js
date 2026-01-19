/**
 * Modern Swipe Card Builder
 * Spesifikasyona göre yeniden tasarlandı
 */

class SwipeCardBuilder {
    constructor() {
        this.escapeHtml = this.escapeHtml.bind(this);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Modern kart içeriği oluştur - DOM elementleri ile
     */
    buildCardContent(place, photoIndex = 0, totalPhotos = 0) {
        const fragment = document.createDocumentFragment();
        
        // 1. COVER (Banner + Title + Meta)
        const coverSection = this.createCoverSection(place, photoIndex, totalPhotos);
        fragment.appendChild(coverSection);
        
        // 2. Content Section
        const contentSection = this.createContentSection(place);
        fragment.appendChild(contentSection);
        
        // 3. Reaction Buttons (blokların altında)
        const reactionButtons = this.createReactionButtons();
        fragment.appendChild(reactionButtons);
        
        return fragment;
    }
    
    /**
     * Rastgele fotoğraf URL'si oluştur
     */
    getRandomPhoto(place) {
        // Place ID'ye göre seed oluştur (aynı mekan için aynı fotoğraf)
        const seed = place.id || Math.floor(Math.random() * 10000);
        
        // Picsum Photos - güvenilir placeholder servisi
        // 1200x800 boyutunda, seed ile aynı fotoğraf garantisi
        return `https://picsum.photos/seed/${seed}/1200/800`;
    }
    
    /**
     * 1. COVER SECTION
     * Banner (foto slider) + Title + Kategori + Rating + Subtitle
     */
    createCoverSection(place, photoIndex, totalPhotos) {
        const cover = document.createElement('div');
        cover.className = 'card-cover';
        
        // Banner (foto slider)
        const banner = document.createElement('div');
        banner.className = 'card-banner';
        
        const photos = place.photos || [];
        let currentPhoto = photos[photoIndex] || null;
        
        // Eğer fotoğraf yoksa rastgele fotoğraf ekle
        if (!currentPhoto) {
            currentPhoto = this.getRandomPhoto(place);
        }
        
        // Fotoğraf göster
        const img = document.createElement('img');
        img.src = currentPhoto;
        img.alt = place.name;
        img.className = 'card-banner-image';
        img.loading = 'lazy';
        img.onerror = function() {
            // Eğer fotoğraf yüklenemezse, alternatif placeholder kullan
            const fallbackSeed = (place.id || Date.now()) + 10000;
            this.src = `https://picsum.photos/seed/${fallbackSeed}/1200/800`;
        };
        banner.appendChild(img);
        
        // Foto sayısı gösterge kaldırıldı (kullanıcı isteği)
        
        cover.appendChild(banner);
        
        // Header Info (Title + Meta)
        const header = document.createElement('div');
        header.className = 'card-header';
        
        // Title (H1)
        const title = document.createElement('h1');
        title.className = 'card-title';
        title.textContent = place.name;
        header.appendChild(title);
        
        // Meta (Kategori + Rating)
        const meta = document.createElement('div');
        meta.className = 'card-meta';
        
        // Categories
        const categories = place.categories || [];
        if (categories.length > 0) {
            const catText = categories.slice(0, 2).join(' • ');
            const catSpan = document.createElement('span');
            catSpan.className = 'card-categories';
            catSpan.textContent = catText;
            meta.appendChild(catSpan);
        }
        
        // Rating (yıldız + numeric)
        if (place.average_rating > 0) {
            if (meta.children.length > 0) {
                const separator = document.createTextNode(' • ');
                meta.appendChild(separator);
            }
            
            const rating = document.createElement('span');
            rating.className = 'card-rating';
            
            const stars = document.createElement('span');
            stars.className = 'card-rating-stars';
            const fullStars = Math.floor(place.average_rating);
            const hasHalfStar = place.average_rating % 1 >= 0.5;
            stars.innerHTML = '★'.repeat(fullStars) + 
                             (hasHalfStar ? '½' : '') + 
                             '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
            
            const numeric = document.createElement('span');
            numeric.className = 'card-rating-numeric';
            numeric.textContent = place.average_rating.toFixed(1);
            
            rating.appendChild(stars);
            rating.appendChild(numeric);
            meta.appendChild(rating);
        }
        
        header.appendChild(meta);
        
        // Subtitle (tek cümle açıklama)
        const subtitle = place.one_line_summary || place.short_description;
        if (subtitle) {
            const subtitleEl = document.createElement('p');
            subtitleEl.className = 'card-subtitle';
            subtitleEl.textContent = subtitle;
            header.appendChild(subtitleEl);
        }
        
        cover.appendChild(header);
        return cover;
    }
    
    /**
     * 2. CONTENT SECTION
     * Tüm bilgi blokları burada
     */
    createContentSection(place) {
        const content = document.createElement('div');
        content.className = 'card-content';
        
        // 2.1. Atmosfer (Chip components)
        const atmosphere = this.createAtmosphereSection(place);
        if (atmosphere) content.appendChild(atmosphere);
        
        // 2.2. Kimler İçin? (Kart şeklinde)
        const audience = this.createAudienceSection(place);
        if (audience) content.appendChild(audience);
        
        // 2.3. Fiyat & Menü (menu-pill components)
        const priceMenu = this.createPriceMenuSection(place);
        if (priceMenu) content.appendChild(priceMenu);
        
        // 2.4. İstatistikler (info-row formatı)
        const stats = this.createStatsSection(place);
        if (stats) content.appendChild(stats);
        
        // 2.5. En İyi Zaman
        if (place.best_time_to_visit) {
            const bestTime = this.createBestTimeSection(place.best_time_to_visit);
            if (bestTime) content.appendChild(bestTime);
        }
        
        // 2.6. Konum (adres + haritada aç)
        const location = this.createLocationSection(place);
        if (location) content.appendChild(location);
        
        return content;
    }
    
    /**
     * 2.1. ATMOSFER BLOĞU
     * Chip komponentleri: soft background (#F8F8F8), 16px radius
     */
    createAtmosphereSection(place) {
        const atmosphere = place.atmosphere_profile || {};
        const tags = place.tags || [];
        const features = place.featured_features || [];
        
        // Eğer hiçbir şey yoksa gösterme
        const atmosphereKeys = Object.keys(atmosphere).filter(k => atmosphere[k] === true);
        if (atmosphereKeys.length === 0 && tags.length === 0 && features.length === 0) {
            return null;
        }
        
        const section = document.createElement('div');
        section.className = 'card-section card-atmosphere';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'Atmosfer';
        section.appendChild(title);
        
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'card-chips';
        
        // Atmosphere tags
        atmosphereKeys.forEach(key => {
            const chip = this.createChip(key);
            chipsContainer.appendChild(chip);
        });
        
        // Regular tags (max 4)
        tags.slice(0, 4).forEach(tagText => {
            const chip = this.createChip(tagText);
            chipsContainer.appendChild(chip);
        });
        
        // Features (max 2)
        features.slice(0, 2).forEach(feature => {
            const chip = this.createChip(feature, 'feature');
            chipsContainer.appendChild(chip);
        });
        
        section.appendChild(chipsContainer);
        return section;
    }
    
    /**
     * Chip komponenti oluştur
     */
    createChip(text, type = 'default') {
        const chip = document.createElement('span');
        chip.className = `card-chip card-chip-${type}`;
        chip.textContent = text;
        return chip;
    }
    
    /**
     * 2.2. KİMLER İÇİN? BLOĞU
     * Kart şeklinde: icon + text, 12-16px spacing
     */
    createAudienceSection(place) {
        const targetAudience = place.target_audience || [];
        const useCases = place.use_cases || {};
        
        if (targetAudience.length === 0 && Object.keys(useCases).length === 0) {
            return null;
        }
        
        const section = document.createElement('div');
        section.className = 'card-section card-audience';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'Kimler İçin?';
        section.appendChild(title);
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'card-audience-cards';
        
        // Target audience items
        targetAudience.slice(0, 3).forEach(audience => {
            const card = this.createAudienceCard(audience, 'person');
            cardsContainer.appendChild(card);
        });
        
        // Use cases (sadece true olanlar)
        Object.entries(useCases).forEach(([key, value]) => {
            if (value === true && cardsContainer.children.length < 5) {
                const card = this.createAudienceCard(key, 'check');
                cardsContainer.appendChild(card);
            }
        });
        
        section.appendChild(cardsContainer);
        return section;
    }
    
    /**
     * Audience kartı oluştur
     */
    createAudienceCard(text, iconType = 'person') {
        const card = document.createElement('div');
        card.className = 'card-audience-card';
        
        const icon = document.createElement('i');
        icon.className = iconType === 'person' ? 'bi bi-person' : 'bi bi-check-circle';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        card.appendChild(icon);
        card.appendChild(textSpan);
        return card;
    }
    
    /**
     * 2.3. FİYAT & MENÜ BLOĞU
     * Menu-pill komponenti: 4 kolon (mobile 2), yüzde gösterimi
     */
    createPriceMenuSection(place) {
        const priceLevel = place.price_level;
        const menuHighlights = place.menu_highlights || [];
        const popularOrders = place.popular_orders || [];
        
        // Menu kategorileri array olarak gelmeli
        const menuCategories = popularOrders.length > 0 ? popularOrders : menuHighlights;
        
        if (!priceLevel && menuCategories.length === 0) {
            return null;
        }
        
        const section = document.createElement('div');
        section.className = 'card-section card-price-menu';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'Fiyat & Menü';
        section.appendChild(title);
        
        const content = document.createElement('div');
        content.className = 'card-price-menu-content';
        
        // Price
        if (priceLevel) {
            const price = document.createElement('div');
            price.className = 'card-price';
            price.textContent = priceLevel;
            content.appendChild(price);
        }
        
        // Menu pills
        if (menuCategories.length > 0) {
            const menuPills = document.createElement('div');
            menuPills.className = 'card-menu-pills';
            
            menuCategories.slice(0, 4).forEach(item => {
                const pill = this.createMenuPill(item);
                menuPills.appendChild(pill);
            });
            
            content.appendChild(menuPills);
        }
        
        section.appendChild(content);
        return section;
    }
    
    /**
     * Menu-pill komponenti oluştur
     */
    createMenuPill(item) {
        const pill = document.createElement('div');
        pill.className = 'card-menu-pill';
        
        const name = document.createElement('div');
        name.className = 'menu-pill-name';
        name.textContent = item.name || item;
        
        const percentage = document.createElement('div');
        percentage.className = 'menu-pill-percentage';
        if (item.percentage) {
            percentage.textContent = `${item.percentage}%`;
        }
        
        pill.appendChild(name);
        pill.appendChild(percentage);
        return pill;
    }
    
    /**
     * 2.4. İSTATİSTİK BLOĞU
     * Info-row formatı: label + value
     */
    createStatsSection(place) {
        const behaviorStats = place.behavior_stats || {};
        const hasStats = behaviorStats.average_stay_minutes || 
                        behaviorStats.laptop_ratio || 
                        behaviorStats.quietness_level;
        
        if (!hasStats) {
            return null;
        }
        
        const section = document.createElement('div');
        section.className = 'card-section card-stats';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'İstatistikler';
        section.appendChild(title);
        
        const statsList = document.createElement('div');
        statsList.className = 'card-stats-list';
        
        if (behaviorStats.average_stay_minutes) {
            const row = this.createInfoRow('Ortalama Kalış', `${behaviorStats.average_stay_minutes} dk`);
            statsList.appendChild(row);
        }
        
        if (behaviorStats.laptop_ratio) {
            const row = this.createInfoRow('Laptop Oranı', `%${behaviorStats.laptop_ratio}`);
            statsList.appendChild(row);
        }
        
        if (behaviorStats.quietness_level) {
            const row = this.createInfoRow('Sessizlik', behaviorStats.quietness_level);
            statsList.appendChild(row);
        }
        
        section.appendChild(statsList);
        return section;
    }
    
    /**
     * Info-row oluştur (label + value)
     */
    createInfoRow(label, value) {
        const row = document.createElement('div');
        row.className = 'card-info-row';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'info-row-label';
        labelSpan.textContent = label;
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'info-row-value';
        valueSpan.textContent = value;
        
        row.appendChild(labelSpan);
        row.appendChild(valueSpan);
        return row;
    }
    
    /**
     * 2.5. EN İYİ ZAMAN BLOĞU
     * Zaman bilgisi kartı
     */
    createBestTimeSection(bestTime) {
        const section = document.createElement('div');
        section.className = 'card-section card-best-time';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'En İyi Zaman';
        section.appendChild(title);
        
        const timeCard = document.createElement('div');
        timeCard.className = 'card-best-time-card';
        
        const icon = document.createElement('i');
        icon.className = 'bi bi-clock';
        
        const text = document.createElement('span');
        text.textContent = bestTime;
        
        timeCard.appendChild(icon);
        timeCard.appendChild(text);
        section.appendChild(timeCard);
        
        return section;
    }
    
    /**
     * 2.6. KONUM BLOĞU
     * Adres + haritada aç linki
     */
    createLocationSection(place) {
        const city = place.city;
        const address = place.address;
        const latitude = place.latitude;
        const longitude = place.longitude;
        
        if (!city && !address) {
            return null;
        }
        
        const section = document.createElement('div');
        section.className = 'card-section card-location';
        
        const title = document.createElement('h2');
        title.className = 'card-section-title';
        title.textContent = 'Konum';
        section.appendChild(title);
        
        const locationCard = document.createElement('div');
        locationCard.className = 'card-location-card';
        
        const icon = document.createElement('i');
        icon.className = 'bi bi-geo-alt';
        
        const addressText = document.createElement('span');
        addressText.className = 'location-address';
        addressText.textContent = [city, address].filter(Boolean).join(', ');
        
        locationCard.appendChild(icon);
        locationCard.appendChild(addressText);
        
        // Haritada aç linki (eğer koordinat varsa)
        if (latitude && longitude) {
            const mapLink = document.createElement('a');
            mapLink.className = 'location-map-link';
            mapLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
            mapLink.target = '_blank';
            mapLink.textContent = 'Haritada aç';
            locationCard.appendChild(mapLink);
        }
        
        section.appendChild(locationCard);
        return section;
    }
    
    /**
     * 3. REACTION BUTTONS
     * Blokların altında, dairesel, 4 buton: X, ✔️, 📘, ℹ️
     */
    createReactionButtons() {
        const container = document.createElement('div');
        container.className = 'card-reaction-buttons';
        
        const buttons = [
            { action: 'dislike', icon: 'bi-x-lg', title: 'Beğenme', class: 'btn-nope' },
            { action: 'like', icon: 'bi-heart-fill', title: 'Beğen', class: 'btn-like' },
            { action: 'save', icon: 'bi-bookmark', title: 'Kaydet', class: 'btn-save' },
            { action: 'detail', icon: 'bi-info-circle', title: 'Detay', class: 'btn-detail' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `reaction-btn ${btn.class}`;
            button.setAttribute('data-action', btn.action);
            button.setAttribute('title', btn.title);
            
            const icon = document.createElement('i');
            icon.className = btn.icon;
            button.appendChild(icon);
            
            container.appendChild(button);
        });
        
        return container;
    }
    
    /**
     * Legacy methods (uyumluluk için)
     */
    buildCard(place) {
        const card = document.createElement('div');
        const content = this.buildCardContent(place);
        card.appendChild(content);
        return card;
    }
    
    buildCardHTML(place) {
        const card = this.buildCard(place);
        return card.outerHTML;
    }
    
    async loadTasteProfile() {
        try {
            const response = await fetch('/api/accounts/me/taste-profile/', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error('Error loading taste profile:', error);
        }
        return null;
    }
    
    calculateTasteMatch(place, tasteProfile) {
        if (!tasteProfile || !tasteProfile.has_enough_data) {
            return null;
        }
        
        const targetAudience = place.target_audience || [];
        const categories = place.categories || [];
        const atmosphere = place.atmosphere_profile || {};
        const useCases = place.use_cases || {};
        
        let matchScore = 0;
        let matchReasons = [];
        let totalWeight = 0;
        
        // Category matching
        if (tasteProfile.category_weights && Object.keys(tasteProfile.category_weights).length > 0) {
            const categoryWeights = tasteProfile.category_weights;
            const placeCategories = categories.map(c => c.toLowerCase());
            
            let categoryMatch = 0;
            
            Object.entries(categoryWeights).forEach(([cat, weight]) => {
                const catLower = cat.toLowerCase();
                const matched = placeCategories.some(pc => {
                    return pc.includes(catLower) || catLower.includes(pc);
                });
                
                if (matched) {
                    categoryMatch += weight;
                }
            });
            
            if (categoryMatch > 0) {
                const weight = 0.3;
                matchScore += categoryMatch * weight;
                totalWeight += weight;
                matchReasons.push('Kategoriler uyumlu');
            }
        }
        
        // Calculate final match
        const finalScore = totalWeight > 0 ? matchScore / totalWeight : 0;
        
        return {
            hasMatch: finalScore > 0.3,
            score: finalScore,
            reasons: matchReasons
        };
    }
    
    buildTasteProfileMatchingHTML(place, matchResult, tasteProfile) {
        if (!matchResult || !matchResult.hasMatch) {
            return '';
        }
        
        const percentage = Math.round(matchResult.score * 100);
        
        return `
            <div class="taste-match-section">
                <div class="taste-match-header">
                    <span class="taste-match-label">Zevk Profili Eşleşmesi</span>
                    <span class="taste-match-percentage">${percentage}%</span>
                </div>
                <div class="taste-match-bar">
                    <div class="taste-match-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.SwipeCardBuilder = SwipeCardBuilder;
}
