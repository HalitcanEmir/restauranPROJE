/**
 * Swipe Card HTML Builder
 * Zenginleştirilmiş kart içeriği oluşturur
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
    
    buildCardHTML(place) {
        const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
        const categories = place.categories || [];
        const tags = place.tags || [];
        const features = place.featured_features || [];
        const hours = place.hours || {};
        const ratingStars = place.average_rating > 0 
            ? '★'.repeat(Math.floor(place.average_rating)) + '☆'.repeat(5 - Math.floor(place.average_rating))
            : '';
        
        // Zenginleştirilmiş veriler
        const atmosphere = place.atmosphere_profile || {};
        const useCases = place.use_cases || {};
        const priceRange = place.price_range || {};
        const menuHighlights = place.menu_highlights || [];
        const popularOrders = place.popular_orders || [];
        const vibeTags = place.vibe_tags || [];
        const similarPlaces = place.similar_places || [];
        const targetAudience = place.target_audience || [];
        const ratingBreakdown = place.rating_breakdown || {};
        const recentComments = place.recent_comments || [];
        
        // Place objesini de geç (tags, features için)
        const placeWithData = { ...place, tags, features };
        
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
                    ${place.one_line_summary ? `<p class="card-slogan">${this.escapeHtml(place.one_line_summary)}</p>` : 
                      place.short_description ? `<p class="card-slogan">${this.escapeHtml(place.short_description)}</p>` : ''}
                </div>
            </div>
            <div class="card-content">
                ${this.buildTasteProfileMatching(place, targetAudience, atmosphere, useCases)}
                ${this.buildWhoGoesHere(placeWithData, atmosphere, targetAudience, useCases)}
                ${this.buildVibeTags(vibeTags)}
                ${this.buildDecisionSupport(place, priceRange, menuHighlights, popularOrders, place.working_suitability, place.wifi_quality, place.power_outlets, atmosphere, place.best_time_to_visit, useCases)}
                ${this.buildAtmosphereProfile(atmosphere, place.working_suitability, place.wifi_quality, place.power_outlets, place.peak_hours)}
                ${this.buildUseCases(useCases)}
                ${this.buildTargetAudience(targetAudience)}
                ${this.buildRatingBreakdown(ratingBreakdown, place.average_rating)}
                ${this.buildSocialProof(recentComments, place.owner_description, place.local_guide_note)}
                ${this.buildSimilarPlaces(similarPlaces)}
                ${this.buildLocation(place.city, place.address)}
                ${this.buildHours(hours)}
                ${place.menu_link ? this.buildMenuLink(place.menu_link) : ''}
                ${tags.length > 0 || features.length > 0 ? `
                    <div class="card-section">
                        <div class="card-section-title">Etiketler</div>
                        <div class="card-tags">
                            ${tags.slice(0, 6).map(tag => `<span class="card-tag">${this.escapeHtml(tag)}</span>`).join('')}
                            ${features.slice(0, 3).map(f => `<span class="card-tag">${this.escapeHtml(f)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async loadTasteProfile() {
        // Taste profile'ı API'den yükle
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
        // Taste profile ile mekan arasında matching hesapla
        if (!tasteProfile || !tasteProfile.has_enough_data) {
            return null;
        }
        
        const targetAudience = place.target_audience || [];
        const categories = place.categories || [];
        const tags = place.tags || [];
        const atmosphere = place.atmosphere_profile || {};
        const useCases = place.use_cases || {};
        const features = place.featured_features || [];
        
        // Matching skorları (weighted)
        let matchScore = 0;
        let matchReasons = [];
        let totalWeight = 0;
        
        // 1. Category matching (weight: 0.3)
        if (tasteProfile.category_weights && Object.keys(tasteProfile.category_weights).length > 0) {
            const categoryWeights = tasteProfile.category_weights;
            const placeCategories = categories.map(c => c.toLowerCase());
            
            let categoryMatch = 0;
            let matchedCats = [];
            
            Object.entries(categoryWeights).forEach(([cat, weight]) => {
                const catLower = cat.toLowerCase();
                const matched = placeCategories.some(pc => {
                    return pc.includes(catLower) || catLower.includes(pc) ||
                           (catLower === 'kafe' && (pc === 'coffee' || pc === 'cafe')) ||
                           (catLower === 'coffee' && (pc === 'kafe' || pc === 'cafe'));
                });
                
                if (matched) {
                    categoryMatch += weight;
                    matchedCats.push(cat);
                }
            });
            
            if (categoryMatch > 0) {
                matchScore += categoryMatch * 0.3;
                matchReasons.push(`🧠 Kategori uyumu: ${matchedCats.slice(0, 2).join(', ')}`);
            }
            totalWeight += 0.3;
        }
        
        // 2. Atmosphere matching (weight: 0.25)
        if (tasteProfile.atmosphere_weights && Object.keys(tasteProfile.atmosphere_weights).length > 0) {
            const atmosphereWeights = tasteProfile.atmosphere_weights;
            const placeTags = [...tags, ...features].map(t => t.toLowerCase());
            
            let atmosphereMatch = 0;
            let matchedAtms = [];
            
            Object.entries(atmosphereWeights).forEach(([atm, weight]) => {
                const atmLower = atm.toLowerCase();
                const matched = placeTags.some(pt => {
                    return pt.includes(atmLower) || atmLower.includes(pt) ||
                           (atmLower === 'estetik' && (pt.includes('aesthetic') || pt.includes('modern'))) ||
                           (atmLower === 'sessiz' && (pt.includes('quiet') || pt.includes('silent')));
                });
                
                if (matched) {
                    atmosphereMatch += weight;
                    matchedAtms.push(atm);
                }
            });
            
            // Atmosphere profile'dan da kontrol et
            if (atmosphere) {
                const atmosphereKeys = ['noise_level', 'lighting', 'vibe', 'mode'];
                atmosphereKeys.forEach(key => {
                    if (atmosphere[key]) {
                        const value = String(atmosphere[key]).toLowerCase();
                        Object.entries(atmosphereWeights).forEach(([atm, weight]) => {
                            if (value.includes(atm.toLowerCase()) || atm.toLowerCase().includes(value)) {
                                atmosphereMatch += weight * 0.5;
                                if (!matchedAtms.includes(atm)) {
                                    matchedAtms.push(atm);
                                }
                            }
                        });
                    }
                });
            }
            
            if (atmosphereMatch > 0) {
                matchScore += Math.min(1.0, atmosphereMatch) * 0.25;
                matchReasons.push(`🎨 Atmosfer uyumu: ${matchedAtms.slice(0, 2).join(', ')}`);
            }
            totalWeight += 0.25;
        }
        
        // 3. Context/Use case matching (weight: 0.3)
        if (tasteProfile.context_weights && Object.keys(tasteProfile.context_weights).length > 0) {
            const contextWeights = tasteProfile.context_weights;
            
            const contextMap = {
                'arkadaş': 'friends',
                'dost': 'friends',
                'sevgili': 'date',
                'date': 'date',
                'aile': 'family',
                'family': 'family',
                'iş': 'work',
                'work': 'work',
                'tek başına': 'solo',
                'solo': 'solo',
                'tek': 'solo'
            };
            
            let contextMatch = 0;
            let matchedContexts = [];
            
            Object.entries(contextWeights).forEach(([ctx, weight]) => {
                const ctxLower = ctx.toLowerCase();
                const useCaseKey = contextMap[ctxLower] || ctxLower;
                
                if (useCases[useCaseKey] === true) {
                    contextMatch += weight;
                    matchedContexts.push(ctx);
                }
            });
            
            if (contextMatch > 0) {
                matchScore += Math.min(1.0, contextMatch) * 0.3;
                matchReasons.push(`🗣 Kullanım uyumu: ${matchedContexts.slice(0, 2).join(', ')}`);
            }
            totalWeight += 0.3;
        }
        
        // 4. Target audience matching (weight: 0.15)
        if (targetAudience.length > 0 && tasteProfile.style_label) {
            const profileDescription = tasteProfile.style_label.toLowerCase();
            const profileWords = profileDescription.split(/[\s\+\-]+/);
            
            let audienceMatch = 0;
            let matchedAuds = [];
            
            targetAudience.forEach(aud => {
                const audLower = aud.toLowerCase();
                
                // Direct match
                if (profileDescription.includes(audLower) || audLower.includes(profileDescription)) {
                    audienceMatch += 0.5;
                    matchedAuds.push(aud);
                } else {
                    // Word-based match
                    const audWords = audLower.split(/[\s\-]+/);
                    const commonWords = audWords.filter(aw => 
                        profileWords.some(pw => pw.includes(aw) || aw.includes(pw))
                    );
                    
                    if (commonWords.length > 0) {
                        audienceMatch += 0.3;
                        matchedAuds.push(aud);
                    }
                }
            });
            
            if (audienceMatch > 0) {
                matchScore += Math.min(1.0, audienceMatch) * 0.15;
                if (matchedAuds.length > 0) {
                    matchReasons.push(`👥 Hedef kitle uyumu: ${matchedAuds.slice(0, 2).join(', ')}`);
                }
            }
            totalWeight += 0.15;
        }
        
        // Normalize score (0-100)
        const normalizedScore = totalWeight > 0 
            ? Math.min(100, Math.round((matchScore / totalWeight) * 100)) 
            : 0;
        
        return {
            score: normalizedScore,
            reasons: matchReasons,
            hasMatch: normalizedScore >= 40 && matchReasons.length > 0
        };
    }
    
    buildTasteProfileMatching(place, targetAudience, atmosphere, useCases) {
        // Bu fonksiyon SwipeManager tarafından async olarak çağrılacak
        // Placeholder - gerçek içerik SwipeManager'da eklenecek
        return '';
    }
    
    buildTasteProfileMatchingHTML(place, matchResult, tasteProfile) {
        if (!matchResult || !matchResult.hasMatch) {
            return '';
        }
        
        const matchPercentage = matchResult.score;
        const matchLevel = matchPercentage >= 70 ? 'high' : matchPercentage >= 50 ? 'medium' : 'low';
        const matchLabel = matchPercentage >= 70 ? 'Çok Uygun' : matchPercentage >= 50 ? 'Uygun' : 'Kısmen Uygun';
        
        return `
            <div class="card-section card-section-taste-match">
                <div class="taste-match-header">
                    <div class="taste-match-title">
                        <i class="bi bi-heart-fill"></i>
                        <span>Bu Mekan Senin İçin Uygun mu?</span>
                    </div>
                    <div class="taste-match-score taste-match-${matchLevel}">
                        <span class="match-percentage">%${matchPercentage}</span>
                        <span class="match-label">${matchLabel}</span>
                    </div>
                </div>
                <div class="taste-match-reasons">
                    <div class="taste-match-subtitle">Neden uygun?</div>
                    <div class="taste-match-reasons-list">
                        ${matchResult.reasons.map(reason => `
                            <div class="taste-match-reason-item">
                                <i class="bi bi-check-circle-fill"></i>
                                <span>${this.escapeHtml(reason)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${tasteProfile && tasteProfile.style_label ? `
                    <div class="taste-match-profile">
                        <div class="taste-match-profile-label">Senin zevk profilin:</div>
                        <div class="taste-match-profile-value">"${this.escapeHtml(tasteProfile.style_label)}"</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    buildWhoGoesHere(place, atmosphere, targetAudience, useCases) {
        // "Buraya kim gider ve neden mutlu olur?" bölümü
        const atmosphereTags = [];
        if (atmosphere) {
            if (atmosphere.noise_level) atmosphereTags.push(atmosphere.noise_level);
            if (atmosphere.lighting) atmosphereTags.push(atmosphere.lighting);
            if (atmosphere.vibe) atmosphereTags.push(atmosphere.vibe);
            if (atmosphere.mood) atmosphereTags.push(...(Array.isArray(atmosphere.mood) ? atmosphere.mood : [atmosphere.mood]));
        }
        
        // Tags ve featured_features'den de atmosfer bilgisi çıkar
        const tags = place.tags || [];
        const features = place.featured_features || [];
        const allAtmosphereTags = [...atmosphereTags, ...tags.slice(0, 3), ...features.slice(0, 2)];
        
        // Mod bilgisi
        const modes = [];
        if (atmosphere && atmosphere.mode) {
            if (Array.isArray(atmosphere.mode)) {
                modes.push(...atmosphere.mode);
            } else {
                modes.push(atmosphere.mode);
            }
        }
        
        // Use cases'den mod çıkar
        if (useCases) {
            if (useCases.work) modes.push('creative work');
            if (useCases.friends) modes.push('friend talk');
            if (useCases.date) modes.push('date');
        }
        
        // Target audience'dan kimler gider bilgisi
        const whoGoes = targetAudience || [];
        
        // Eğer hiçbir veri yoksa gösterme
        if (allAtmosphereTags.length === 0 && modes.length === 0 && whoGoes.length === 0) {
            return '';
        }
        
        return `
            <div class="card-section card-section-hero">
                <div class="card-section-title-hero">
                    <i class="bi bi-question-circle"></i>
                    Buraya Kim Gider ve Neden Mutlu Olur?
                </div>
                ${allAtmosphereTags.length > 0 ? `
                    <div class="who-goes-atmosphere">
                        <div class="who-goes-label">Atmosfer:</div>
                        <div class="who-goes-tags">
                            ${allAtmosphereTags.slice(0, 5).map(tag => `<span class="who-goes-tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${modes.length > 0 ? `
                    <div class="who-goes-modes">
                        <div class="who-goes-label">Mod:</div>
                        <div class="who-goes-tags">
                            ${modes.slice(0, 4).map(mode => `<span class="who-goes-tag who-goes-tag-mode">${this.escapeHtml(mode)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${whoGoes.length > 0 ? `
                    <div class="who-goes-audience">
                        <div class="who-goes-label">En çok tercih edenler:</div>
                        <div class="who-goes-list">
                            ${whoGoes.slice(0, 4).map(audience => `
                                <div class="who-goes-item">
                                    <i class="bi bi-person-check-fill"></i>
                                    <span>${this.escapeHtml(audience)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${place.one_line_summary ? `
                    <div class="who-goes-summary">
                        <i class="bi bi-quote"></i>
                        <span>"${this.escapeHtml(place.one_line_summary)}"</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    buildVibeTags(vibeTags) {
        if (!vibeTags || vibeTags.length === 0) return '';
        return `
            <div class="card-section">
                <div class="card-section-title">Vibe</div>
                <div class="card-tags">
                    ${vibeTags.map(tag => `<span class="card-tag card-tag-vibe">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    buildDecisionSupport(place, priceRange, menuHighlights, popularOrders, workingSuitability, wifiQuality, powerOutlets, atmosphere, bestTime, useCases) {
        // "Kullanıcının Kararını Kolaylaştıran Bilgiler" - Tüm kritik bilgileri bir arada
        const hasAnyData = priceRange || place.price_level || 
                          (menuHighlights && menuHighlights.length > 0) || 
                          (popularOrders && popularOrders.length > 0) ||
                          workingSuitability > 0 || wifiQuality || powerOutlets ||
                          (atmosphere && atmosphere.noise_level) ||
                          bestTime || (useCases && Object.keys(useCases).length > 0);
        
        if (!hasAnyData) return '';
        
        const noiseLevel = (atmosphere && atmosphere.noise_level) ? atmosphere.noise_level : null;
        const tableSize = (atmosphere && atmosphere.table_size) ? atmosphere.table_size : null;
        
        return `
            <div class="card-section card-section-decision">
                <div class="card-section-title">Karar Destekleyici Bilgiler</div>
                
                ${(priceRange && priceRange.min) || place.price_level ? `
                    <div class="decision-item">
                        <div class="decision-item-header">
                            <i class="bi bi-cash-coin"></i>
                            <span class="decision-item-title">Ne kadar öderim?</span>
                        </div>
                        <div class="decision-item-content">
                            ${place.price_level ? `<span class="price-badge">${this.escapeHtml(place.price_level)}</span>` : ''}
                            ${priceRange && priceRange.min ? `<span class="price-range-text">Ortalama kişi başı: ₺${priceRange.min}–₺${priceRange.max}</span>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${(menuHighlights && menuHighlights.length > 0) || (popularOrders && popularOrders.length > 0) ? `
                    <div class="decision-item">
                        <div class="decision-item-header">
                            <i class="bi bi-fork-knife"></i>
                            <span class="decision-item-title">Ne yerim?</span>
                        </div>
                        <div class="decision-item-content">
                            ${menuHighlights && menuHighlights.length > 0 ? `
                                <div class="menu-highlights-mini">
                                    ${menuHighlights.slice(0, 3).map(item => `
                                        <div class="menu-highlight-mini">
                                            <span class="menu-emoji-mini">${item.emoji || '☕'}</span>
                                            <span class="menu-name-mini">${this.escapeHtml(item.name)}</span>
                                            ${item.rating ? `<span class="menu-rating-mini">"${this.escapeHtml(item.rating)}"</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${popularOrders && popularOrders.length > 0 ? `
                                <div class="popular-orders-mini">
                                    <div class="popular-orders-mini-title">En çok sipariş edilenler:</div>
                                    ${popularOrders.slice(0, 3).map(order => `
                                        <div class="popular-order-mini">
                                            <span>${this.escapeHtml(order.item)}</span>
                                            ${order.percentage ? `<span class="order-percentage-mini">%${order.percentage}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${workingSuitability > 0 || wifiQuality || powerOutlets || noiseLevel || tableSize ? `
                    <div class="decision-item">
                        <div class="decision-item-header">
                            <i class="bi bi-laptop"></i>
                            <span class="decision-item-title">Çalışılabilir mi?</span>
                        </div>
                        <div class="decision-item-content">
                            <div class="working-features-mini">
                                ${workingSuitability > 0 ? `
                                    <div class="working-feature-mini">
                                        <i class="bi bi-laptop"></i>
                                        <span>Laptop: ✓</span>
                                    </div>
                                ` : ''}
                                ${powerOutlets ? `
                                    <div class="working-feature-mini">
                                        <i class="bi bi-plug"></i>
                                        <span>Priz: ${this.escapeHtml(powerOutlets)}</span>
                                    </div>
                                ` : ''}
                                ${wifiQuality ? `
                                    <div class="working-feature-mini">
                                        <i class="bi bi-wifi"></i>
                                        <span>Wi-Fi: ${this.escapeHtml(wifiQuality)}</span>
                                    </div>
                                ` : ''}
                                ${noiseLevel ? `
                                    <div class="working-feature-mini">
                                        <i class="bi bi-volume-down"></i>
                                        <span>Ses: ${this.escapeHtml(noiseLevel)}</span>
                                    </div>
                                ` : ''}
                                ${tableSize ? `
                                    <div class="working-feature-mini">
                                        <i class="bi bi-table"></i>
                                        <span>Masa: ${this.escapeHtml(tableSize)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${bestTime ? `
                    <div class="decision-item">
                        <div class="decision-item-header">
                            <i class="bi bi-clock"></i>
                            <span class="decision-item-title">Ne kadar kalırım? / En iyi zaman</span>
                        </div>
                        <div class="decision-item-content">
                            <div class="best-time-mini">
                                <i class="bi bi-clock-history"></i>
                                <span>${this.escapeHtml(bestTime)}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${useCases && Object.keys(useCases).length > 0 ? `
                    <div class="decision-item">
                        <div class="decision-item-header">
                            <i class="bi bi-people"></i>
                            <span class="decision-item-title">Kimlerle giderim?</span>
                        </div>
                        <div class="decision-item-content">
                            <div class="social-context">
                                ${Object.entries(useCases).filter(([key, value]) => value === true).length > 0 ? `
                                    <div class="social-context-suitable">
                                        <div class="social-context-label">Uygun:</div>
                                        <div class="social-context-tags">
                                            ${Object.entries(useCases)
                                                .filter(([key, value]) => value === true)
                                                .map(([key]) => {
                                                    const labels = {
                                                        'date': 'date',
                                                        'friends': 'arkadaş',
                                                        'work': 'tek başına çalışma',
                                                        'solo': 'tek başına',
                                                        'family': 'aile'
                                                    };
                                                    return `<span class="social-tag social-tag-suitable">${this.escapeHtml(labels[key] || key)}</span>`;
                                                }).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                ${Object.entries(useCases).filter(([key, value]) => value === false).length > 0 ? `
                                    <div class="social-context-not-suitable">
                                        <div class="social-context-label">Uygun değil:</div>
                                        <div class="social-context-tags">
                                            ${Object.entries(useCases)
                                                .filter(([key, value]) => value === false)
                                                .map(([key]) => {
                                                    const labels = {
                                                        'group': 'kalabalık grup',
                                                        'family': 'çocuklu aile',
                                                        'date': 'date',
                                                        'friends': 'arkadaş'
                                                    };
                                                    return `<span class="social-tag social-tag-not-suitable">${this.escapeHtml(labels[key] || key)}</span>`;
                                                }).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    buildAtmosphereProfile(atmosphere, workingSuitability, wifiQuality, powerOutlets, peakHours) {
        // Show if we have any atmosphere data
        const hasData = (atmosphere && Object.keys(atmosphere).length > 0) || 
                       workingSuitability > 0 || 
                       wifiQuality || 
                       powerOutlets || 
                       (peakHours && peakHours.start);
        
        if (!hasData) return '';
        
        const noiseLevel = (atmosphere && atmosphere.noise_level) ? atmosphere.noise_level : null;
        const lighting = (atmosphere && atmosphere.lighting) ? atmosphere.lighting : null;
        const vibe = (atmosphere && atmosphere.vibe) ? atmosphere.vibe : null;
        
        return `
            <div class="card-section">
                <div class="card-section-title">Atmosfer Detayları</div>
                <div class="atmosphere-grid">
                    ${noiseLevel ? `
                        <div class="atmosphere-item">
                            <i class="bi bi-volume-down"></i>
                            <span><strong>Ses Seviyesi:</strong> ${this.escapeHtml(noiseLevel)}</span>
                        </div>
                    ` : ''}
                    ${lighting ? `
                        <div class="atmosphere-item">
                            <i class="bi bi-lightbulb"></i>
                            <span><strong>Işık:</strong> ${this.escapeHtml(lighting)}</span>
                        </div>
                    ` : ''}
                    ${vibe ? `
                        <div class="atmosphere-item">
                            <i class="bi bi-emoji-smile"></i>
                            <span><strong>Mod:</strong> ${this.escapeHtml(vibe)}</span>
                        </div>
                    ` : ''}
                    ${workingSuitability > 0 ? `
                        <div class="atmosphere-item atmosphere-item-highlight">
                            <i class="bi bi-laptop"></i>
                            <span><strong>Çalışma Uygunluğu:</strong> %${workingSuitability}</span>
                        </div>
                    ` : ''}
                    ${wifiQuality ? `
                        <div class="atmosphere-item">
                            <i class="bi bi-wifi"></i>
                            <span>Wi-Fi: ${this.escapeHtml(wifiQuality)}</span>
                        </div>
                    ` : ''}
                    ${powerOutlets ? `
                        <div class="atmosphere-item">
                            <i class="bi bi-plug"></i>
                            <span>Priz: ${this.escapeHtml(powerOutlets)}</span>
                        </div>
                    ` : ''}
                    ${peakHours && peakHours.start ? `
                        <div class="atmosphere-item atmosphere-item-peak">
                            <i class="bi bi-clock-history"></i>
                            <span><strong>Saatlik Doluluk:</strong> ${this.escapeHtml(peakHours.start)}–${this.escapeHtml(peakHours.end)} yoğun${peakHours.quiet_after ? `, ${this.escapeHtml(peakHours.quiet_after)} sonrası sakin` : ''}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    buildUseCases(useCases) {
        if (!useCases || Object.keys(useCases).length === 0) return '';
        
        const icons = {
            'date': 'bi-heart',
            'friends': 'bi-people',
            'work': 'bi-laptop',
            'group': 'bi-people-fill',
            'family': 'bi-house-heart',
            'solo': 'bi-person'
        };
        
        const labels = {
            'date': 'Date',
            'friends': 'Arkadaş',
            'work': 'Çalışma',
            'group': 'Grup',
            'family': 'Aile',
            'solo': 'Tek Başına'
        };
        
        const suitable = [];
        const notSuitable = [];
        
        Object.entries(useCases).forEach(([key, value]) => {
            if (value === true) {
                suitable.push({ key, icon: icons[key] || 'bi-check', label: labels[key] || key });
            } else if (value === false) {
                notSuitable.push({ key, icon: icons[key] || 'bi-x', label: labels[key] || key });
            }
        });
        
        if (suitable.length === 0 && notSuitable.length === 0) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Uygun Kullanım</div>
                <div class="use-cases">
                    ${suitable.length > 0 ? `
                        <div class="use-cases-suitable">
                            ${suitable.map(item => `
                                <div class="use-case-item use-case-suitable">
                                    <i class="bi ${item.icon}"></i>
                                    <span>${this.escapeHtml(item.label)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${notSuitable.length > 0 ? `
                        <div class="use-cases-not-suitable">
                            ${notSuitable.map(item => `
                                <div class="use-case-item use-case-not-suitable">
                                    <i class="bi ${item.icon}"></i>
                                    <span>${this.escapeHtml(item.label)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    buildPriceInfo(priceRange, priceLevel) {
        if (!priceLevel && (!priceRange || !priceRange.min)) return '';
        
        let priceText = '';
        if (priceRange && priceRange.min && priceRange.max) {
            priceText = `₺${priceRange.min}–₺${priceRange.max}`;
        }
        
        return `
            <div class="card-section">
                <div class="card-section-title">Fiyat</div>
                <div class="price-info">
                    ${priceLevel ? `<span class="price-level">${this.escapeHtml(priceLevel)}</span>` : ''}
                    ${priceText ? `<span class="price-range">Ortalama kişi başı: ${this.escapeHtml(priceText)}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    buildMenuHighlights(menuHighlights, popularOrders) {
        if ((!menuHighlights || menuHighlights.length === 0) && (!popularOrders || popularOrders.length === 0)) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Menü Öne Çıkanları</div>
                ${menuHighlights.length > 0 ? `
                    <div class="menu-highlights">
                        ${menuHighlights.map(item => `
                            <div class="menu-highlight-item">
                                <span class="menu-emoji">${item.emoji || '☕'}</span>
                                <span class="menu-name">${this.escapeHtml(item.name)}</span>
                                ${item.rating ? `<span class="menu-rating">"${this.escapeHtml(item.rating)}"</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${popularOrders.length > 0 ? `
                    <div class="popular-orders">
                        <div class="popular-orders-title">En çok sipariş edilenler:</div>
                        ${popularOrders.map(order => `
                            <div class="popular-order-item">
                                <span class="order-name">${this.escapeHtml(order.item)}</span>
                                ${order.percentage ? `<span class="order-percentage">%${order.percentage}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    buildWorkingInfo(workingSuitability, wifiQuality, powerOutlets) {
        if (!workingSuitability && !wifiQuality && !powerOutlets) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Çalışma Dostu</div>
                <div class="working-info">
                    ${workingSuitability > 0 ? `
                        <div class="working-item">
                            <i class="bi bi-laptop"></i>
                            <span>Laptop: ✓</span>
                        </div>
                    ` : ''}
                    ${powerOutlets ? `
                        <div class="working-item">
                            <i class="bi bi-plug"></i>
                            <span>Priz: ${this.escapeHtml(powerOutlets)}</span>
                        </div>
                    ` : ''}
                    ${wifiQuality ? `
                        <div class="working-item">
                            <i class="bi bi-wifi"></i>
                            <span>Wi-Fi: ${this.escapeHtml(wifiQuality)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    buildBestTime(bestTime) {
        if (!bestTime) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">En İyi Zaman</div>
                <div class="best-time">
                    <i class="bi bi-clock"></i>
                    <span>${this.escapeHtml(bestTime)}</span>
                </div>
            </div>
        `;
    }
    
    buildTargetAudience(targetAudience) {
        if (!targetAudience || targetAudience.length === 0) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Bu Mekan Şu Tip Kullanıcıları Sever</div>
                <div class="target-audience">
                    ${targetAudience.map(audience => `
                        <div class="audience-item">
                            <i class="bi bi-person-check"></i>
                            <span>${this.escapeHtml(audience)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    buildRatingBreakdown(ratingBreakdown, averageRating) {
        if (!ratingBreakdown || Object.keys(ratingBreakdown).length === 0) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Puanlar</div>
                <div class="rating-breakdown">
                    ${ratingBreakdown.atmosphere > 0 ? `
                        <div class="rating-item">
                            <span class="rating-label">Atmosfer:</span>
                            <span class="rating-value">${ratingBreakdown.atmosphere.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    ${ratingBreakdown.coffee > 0 ? `
                        <div class="rating-item">
                            <span class="rating-label">Kahve:</span>
                            <span class="rating-value">${ratingBreakdown.coffee.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    ${ratingBreakdown.value > 0 ? `
                        <div class="rating-item">
                            <span class="rating-label">Fiyat/Performans:</span>
                            <span class="rating-value">${ratingBreakdown.value.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    ${ratingBreakdown.staff > 0 ? `
                        <div class="rating-item">
                            <span class="rating-label">Personel:</span>
                            <span class="rating-value">${ratingBreakdown.staff.toFixed(1)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    buildSocialProof(recentComments, ownerDescription, localGuideNote) {
        let html = '';
        
        if (recentComments && recentComments.length > 0) {
            html += `
                <div class="card-section">
                    <div class="card-section-title">Son Yorumlar</div>
                    <div class="recent-comments">
                        ${recentComments.map(comment => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <span class="comment-user">${this.escapeHtml(comment.user)}</span>
                                    <span class="comment-rating">${'★'.repeat(Math.floor(comment.rating))}</span>
                                </div>
                                <div class="comment-text">"${this.escapeHtml(comment.comment)}"</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (ownerDescription) {
            html += `
                <div class="card-section">
                    <div class="card-section-title">Dükkan Sahibinden</div>
                    <div class="owner-description">${this.escapeHtml(ownerDescription)}</div>
                </div>
            `;
        }
        
        if (localGuideNote) {
            html += `
                <div class="card-section">
                    <div class="card-section-title">Local Guide Notu</div>
                    <div class="local-guide-note">${this.escapeHtml(localGuideNote)}</div>
                </div>
            `;
        }
        
        return html;
    }
    
    buildSimilarPlaces(similarPlaces) {
        if (!similarPlaces || similarPlaces.length === 0) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Benzer Mekanlar</div>
                <div class="similar-places">
                    ${similarPlaces.map(place => `
                        <span class="similar-place-tag">${this.escapeHtml(place)}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    buildLocation(city, address) {
        if (!city) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Konum</div>
                <div class="location-info">
                    <i class="bi bi-geo-alt-fill"></i>
                    <span>${this.escapeHtml(city)}${address ? ', ' + this.escapeHtml(address.substring(0, 60)) : ''}</span>
                </div>
            </div>
        `;
    }
    
    buildHours(hours) {
        if (!hours || Object.keys(hours).length === 0) return '';
        
        return `
            <div class="card-section">
                <div class="card-section-title">Çalışma Saatleri</div>
                <div class="hours-info">
                    ${Object.entries(hours).slice(0, 7).map(([day, time]) => `
                        <div class="hour-item">
                            <strong>${this.escapeHtml(day)}:</strong> ${this.escapeHtml(time)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    buildMenuLink(menuLink) {
        return `
            <div class="card-section" style="text-align: center; margin-top: 25px;">
                <a href="${this.escapeHtml(menuLink)}" target="_blank" class="menu-link-btn">
                    <i class="bi bi-menu-button-wide"></i> Menüyü Görüntüle
                </a>
            </div>
        `;
    }
}

// Make SwipeCardBuilder available globally
if (typeof window !== 'undefined') {
    window.SwipeCardBuilder = SwipeCardBuilder;
}
