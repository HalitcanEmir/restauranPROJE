/**
 * Profile Page JavaScript
 * Modern, interactive profile page
 */

class ProfilePage {
    constructor() {
        this.init();
    }
    
    init() {
        this.loadTasteProfile();
        this.setupAnimations();
        this.renderVisitCalendar();
    }
    
    setupAnimations() {
        // Animate visit items on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.visit-item').forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'all 0.5s ease-out';
            observer.observe(item);
        });
    }
    
    async loadTasteProfile() {
        const content = document.getElementById('tasteProfileContent');
        if (!content) return;
        
        try {
            const response = await fetch('/api/users/me/taste-profile/', {
                credentials: 'same-origin'
            });
            const data = await response.json();
            
            if (data.success && data.has_enough_data) {
                content.innerHTML = this.buildTasteProfileHTML(data);
                this.animateProgressBars();
            } else {
                content.innerHTML = this.buildEmptyTasteProfileHTML(data);
            }
        } catch (error) {
            console.error('Error loading taste profile:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-muted);">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Zevk profili yüklenirken bir hata oluştu.</p>
                </div>
            `;
        }
    }
    
    buildEmptyTasteProfileHTML(data) {
        return `
            <div style="text-align: center; padding: var(--spacing-lg);">
                <i class="bi bi-info-circle" style="font-size: 2rem; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
                <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                    ${data.message || 'Zevk profilini çıkarabilmemiz için birkaç mekan beğenmen gerekiyor.'}
                </p>
                <div style="background: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--radius-lg); margin-bottom: var(--spacing-lg);">
                    <p style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">
                        Şu an <strong>${data.interaction_count || 0}</strong> etkileşimin var.
                        <br>En az <strong>${data.min_interactions || 5}</strong> mekanla etkileşime geç.
                    </p>
                </div>
                <a href="/places/discover/swipe/" class="btn btn-primary">
                    <i class="bi bi-compass"></i> Keşfet
                </a>
            </div>
        `;
    }
    
    buildTasteProfileHTML(data) {
        let html = '';
        
        // Style Label
        if (data.style_label) {
            html += `
                <div class="taste-profile-style">
                    <div class="taste-profile-style-label">
                        <i class="bi bi-stars"></i> ${this.escapeHtml(data.style_label)}
                    </div>
                    <p style="margin: 0; font-size: var(--text-sm); opacity: 0.9;">
                        Sen ${data.style_label.toLowerCase()} mekan seven birisin.
                    </p>
                </div>
            `;
        }
        
        // Context Weights
        if (data.context_weights && Object.keys(data.context_weights).length > 0) {
            const topContexts = Object.entries(data.context_weights)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            html += `
                <div class="taste-profile-section">
                    <div class="taste-profile-section-title">
                        <i class="bi bi-people"></i> Kiminle Gidilir
                    </div>
                    ${topContexts.map(([ctx, weight]) => {
                        const percent = Math.round(weight * 100);
                        const label = this.getContextLabel(ctx);
                        return `
                            <div class="taste-profile-progress">
                                <div class="taste-profile-progress-label">
                                    <span>${label}</span>
                                    <span>%${percent}</span>
                                </div>
                                <div class="taste-profile-progress-bar">
                                    <div class="taste-profile-progress-fill" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // Atmosphere Weights
        if (data.atmosphere_weights && Object.keys(data.atmosphere_weights).length > 0) {
            const topAtmospheres = Object.entries(data.atmosphere_weights)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            html += `
                <div class="taste-profile-section">
                    <div class="taste-profile-section-title">
                        <i class="bi bi-palette"></i> Atmosfer Tercihlerin
                    </div>
                    ${topAtmospheres.map(([atm, weight]) => {
                        const percent = Math.round(weight * 100);
                        return `
                            <div class="taste-profile-progress">
                                <div class="taste-profile-progress-label">
                                    <span>${this.escapeHtml(atm)}</span>
                                    <span>%${percent}</span>
                                </div>
                                <div class="taste-profile-progress-bar">
                                    <div class="taste-profile-progress-fill" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // Category Weights
        if (data.category_weights && Object.keys(data.category_weights).length > 0) {
            const topCategories = Object.entries(data.category_weights)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            html += `
                <div class="taste-profile-section">
                    <div class="taste-profile-section-title">
                        <i class="bi bi-tags"></i> Kategori Tercihlerin
                    </div>
                    ${topCategories.map(([cat, weight]) => {
                        const percent = Math.round(weight * 100);
                        return `
                            <div class="taste-profile-progress">
                                <div class="taste-profile-progress-label">
                                    <span>${this.escapeHtml(cat)}</span>
                                    <span>%${percent}</span>
                                </div>
                                <div class="taste-profile-progress-bar">
                                    <div class="taste-profile-progress-fill" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        html += `
            <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--border-color);">
                <small style="color: var(--text-muted); font-size: var(--text-xs);">
                    <i class="bi bi-info-circle"></i>
                    Yeni mekanlar beğendikçe zevk profilin yenilenecek.
                </small>
            </div>
        `;
        
        return html;
    }
    
    getContextLabel(ctx) {
        const labels = {
            'arkadaş': 'Arkadaşlarınla',
            'dost': 'Arkadaşlarınla',
            'sevgili': 'Sevgiliyle',
            'aile': 'Aileyle',
            'tek': 'Tek Başına',
            'is': 'İş İçin'
        };
        return labels[ctx] || ctx.charAt(0).toUpperCase() + ctx.slice(1);
    }
    
    animateProgressBars() {
        const progressBars = document.querySelectorAll('.taste-profile-progress-fill');
        progressBars.forEach((bar, index) => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, index * 100);
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderVisitCalendar() {
        const calendarEl = document.getElementById('visitCalendar');
        if (!calendarEl) return;

        let visitDates = [];
        try {
            const raw = calendarEl.dataset.visitDates || '[]';
            visitDates = JSON.parse(raw);
        } catch (e) {
            console.error('visit_dates_json parse error', e);
            visitDates = [];
        }

        const visitSet = new Set(visitDates);

        const today = new Date();
        // Son 365 günü göster
        const days = [];
        for (let i = 364; i >= 0; i--) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(today.getDate() - i);
            days.push(d);
        }

        const grid = document.createElement('div');
        grid.className = 'visit-calendar-grid';

        days.forEach(date => {
            const iso = date.toISOString().slice(0, 10);
            const isVisited = visitSet.has(iso);
            const dayEl = document.createElement('div');
            dayEl.className = 'visit-calendar-day' + (isVisited ? ' visited' : '');
            dayEl.title = `${iso} - ${isVisited ? 'Ziyaret var' : 'Kayıt yok'}`;
            grid.appendChild(dayEl);
        });

        const legend = document.createElement('div');
        legend.className = 'visit-calendar-legend';
        legend.innerHTML = `
            <span>Az</span>
            <span class="visit-calendar-legend-swatch"></span>
            <span class="visit-calendar-legend-swatch visited"></span>
            <span>Çok</span>
        `;

        calendarEl.innerHTML = '';
        calendarEl.appendChild(grid);
        calendarEl.appendChild(legend);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ProfilePage();
});
