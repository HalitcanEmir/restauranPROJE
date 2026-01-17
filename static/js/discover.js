/**
 * Modern Discover Page
 * JavaScript-driven, component-based
 */

class DiscoverPage {
    constructor() {
        this.places = [];
        this.filters = {
            city: '',
            category: '',
            mode: '',
            search: ''
        };
        this.init();
    }
    
    init() {
        this.setupFilters();
        this.loadPlaces();
        this.setupSearch();
    }
    
    setupFilters() {
        const filterForm = document.getElementById('filterForm');
        if (!filterForm) return;
        
        // Get initial filter values from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.filters = {
            city: urlParams.get('city') || '',
            category: urlParams.get('category') || '',
            mode: urlParams.get('mode') || '',
            search: urlParams.get('search') || ''
        };
        
        // Populate form
        Object.keys(this.filters).forEach(key => {
            const input = filterForm.querySelector(`[name="${key}"]`);
            if (input) input.value = this.filters[key];
        });
        
        // Handle form submission
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters();
        });
        
        // Auto-submit on change
        filterForm.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }
    
    setupSearch() {
        const searchInput = document.querySelector('[name="search"]');
        if (!searchInput) return;
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 500);
        });
    }
    
    applyFilters() {
        const filterForm = document.getElementById('filterForm');
        if (!filterForm) return;
        
        const formData = new FormData(filterForm);
        this.filters = {
            city: formData.get('city') || '',
            category: formData.get('category') || '',
            mode: formData.get('mode') || '',
            search: formData.get('search') || ''
        };
        
        // Update URL without reload
        const params = new URLSearchParams();
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.pushState({}, '', newUrl);
        
        this.loadPlaces();
    }
    
    async loadPlaces() {
        const container = document.getElementById('placesContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Mekanlar yükleniyor...</p></div>';
        
        try {
            const params = new URLSearchParams();
            Object.entries(this.filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const response = await fetch(`/api/places/discover/?${params.toString()}`);
            const data = await response.json();
            
            if (data.success && data.places) {
                this.places = data.places;
                this.renderPlaces();
            } else {
                container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Mekan bulunamadı</p></div>';
            }
        } catch (error) {
            console.error('Error loading places:', error);
            container.innerHTML = '<div class="error-state"><i class="bi bi-exclamation-triangle"></i><p>Bir hata oluştu</p></div>';
        }
    }
    
    renderPlaces() {
        const container = document.getElementById('placesContainer');
        if (!container) return;
        
        if (this.places.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Mekan bulunamadı</p></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="places-grid">
                ${this.places.map(place => this.renderPlaceCard(place)).join('')}
            </div>
        `;
        
        // Add animations
        container.querySelectorAll('.place-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-slide-up');
        });
    }
    
    renderPlaceCard(place) {
        const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
        const rating = place.average_rating || 0;
        const ratingStars = this.renderStars(rating);
        const tags = (place.tags || []).slice(0, 3).map(tag => 
            `<span class="tag">${this.escapeHtml(tag)}</span>`
        ).join('');
        
        return `
            <div class="place-card" data-component="card">
                ${photo ? `
                    <div class="place-card-image" style="background-image: url('${photo}')">
                        <div class="place-card-overlay"></div>
                    </div>
                ` : `
                    <div class="place-card-image">
                        <i class="bi bi-cup-hot"></i>
                    </div>
                `}
                <div class="place-card-body">
                    <h3 class="place-card-title">
                        <a href="/places/${place.id}/">${this.escapeHtml(place.name)}</a>
                    </h3>
                    <p class="place-card-location">
                        <i class="bi bi-geo-alt"></i> ${this.escapeHtml(place.city || '')}
                    </p>
                    ${place.short_description ? `
                        <p class="place-card-description">${this.escapeHtml(place.short_description.substring(0, 100))}...</p>
                    ` : ''}
                    <div class="place-card-rating">
                        ${ratingStars}
                        <span class="rating-value">${rating.toFixed(1)}</span>
                    </div>
                    ${tags ? `<div class="place-card-tags">${tags}</div>` : ''}
                    <div class="place-card-footer">
                        <span class="place-price">${place.price_level || '₺₺'}</span>
                        <a href="/places/${place.id}/" class="btn btn-primary btn-sm">
                            Detay <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="bi bi-star-fill"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="bi bi-star-half"></i>';
            } else {
                stars += '<i class="bi bi-star"></i>';
            }
        }
        
        return `<div class="stars">${stars}</div>`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize on page load
if (document.getElementById('placesContainer')) {
    document.addEventListener('DOMContentLoaded', () => {
        new DiscoverPage();
    });
}
