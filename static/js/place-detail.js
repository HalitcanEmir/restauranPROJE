/**
 * Place Detail Page
 * Modern, interactive place detail view
 */

class PlaceDetailPage {
    constructor() {
        this.placeId = window.location.pathname.split('/').filter(p => p)[1];
        this.init();
    }
    
    init() {
        this.setupReviewModal();
        this.setupImageGallery();
        this.setupTabs();
    }
    
    setupReviewModal() {
        const modal = document.getElementById('reviewModal');
        if (!modal) return;
        
        window.openReviewModal = (placeId, isUpdate) => {
            const modalComponent = new ModalComponent(modal);
            modalComponent.open();
            
            if (isUpdate) {
                // Load existing review
                this.loadExistingReview(placeId);
            }
        };
    }
    
    async loadExistingReview(placeId) {
        try {
            const response = await fetch(`/api/places/${placeId}/review/`);
            const data = await response.json();
            
            if (data.success && data.review) {
                const form = document.getElementById('reviewForm');
                if (form) {
                    form.querySelector('[name="rating"]').value = data.review.rating;
                    form.querySelector('[name="comment"]').value = data.review.comment || '';
                    form.querySelector('[name="with_whom"]').value = data.review.with_whom || '';
                }
            }
        } catch (error) {
            console.error('Error loading review:', error);
        }
    }
    
    setupImageGallery() {
        const gallery = document.querySelector('.place-image-gallery');
        if (!gallery) return;
        
        const images = gallery.querySelectorAll('img');
        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                this.openImageModal(img.src, index);
            });
        });
    }
    
    openImageModal(src, index) {
        // Create image modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
                <div class="modal-header">
                    <h3>Fotoğraflar</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body" style="padding: 0;">
                    <img src="${src}" style="width: 100%; height: auto; max-height: 80vh; object-fit: contain;">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    setupTabs() {
        const tabs = document.querySelector('[data-component="tabs"]');
        if (tabs) {
            new TabsComponent(tabs);
        }
    }
}

// Initialize
if (window.location.pathname.includes('/places/') && window.location.pathname.split('/').length > 2) {
    document.addEventListener('DOMContentLoaded', () => {
        new PlaceDetailPage();
    });
}
