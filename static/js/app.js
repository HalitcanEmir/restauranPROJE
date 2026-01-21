/**
 * Modern JavaScript Application
 * Component-based architecture
 */

class App {
    constructor() {
        this.components = new Map();
        this.init();
    }
    
    init() {
        this.setupTheme();
        this.setupNavigation();
        this.setupComponents();
        this.setupGlobalHandlers();
    }
    
    setupTheme() {
        // Theme toggle functionality
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Theme toggle button
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }
    
    setupNavigation() {
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        
        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        }
        
        // Close mobile menu on outside click
        document.addEventListener('click', (e) => {
            if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileMenu.classList.remove('active');
            }
        });
        
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href.length > 1) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    }
    
    setupComponents() {
        // Auto-initialize components
        this.initComponent('Card', CardComponent);
        this.initComponent('Modal', ModalComponent);
        this.initComponent('Toast', ToastComponent);
        this.initComponent('Dropdown', DropdownComponent);
        this.initComponent('Tabs', TabsComponent);
    }
    
    initComponent(name, ComponentClass) {
        const elements = document.querySelectorAll(`[data-component="${name.toLowerCase()}"]`);
        elements.forEach(element => {
            const component = new ComponentClass(element);
            this.components.set(`${name}-${this.components.size}`, component);
        });
    }
    
    setupGlobalHandlers() {
        // Form validation + loading states birlikte yönetilsin
        document.querySelectorAll('form[data-validate]').forEach(form => {
            form.addEventListener('submit', (e) => {
                const loadingButtons = form.querySelectorAll('[data-loading]');
                
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    // Hatalıysa butonları eski haline getir
                    loadingButtons.forEach(btn => btn.setLoading(false));
                } else {
                    // Geçerliyse submit olurken loading göster
                    loadingButtons.forEach(btn => btn.setLoading(true));
                }
            });
        });
    }
    
    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
                this.showError(input, 'Bu alan zorunludur');
            } else {
                input.classList.remove('error');
            }
        });
        
        return isValid;
    }
    
    showError(input, message) {
        let errorElement = input.parentElement.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            input.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
}

// Component Classes
class CardComponent {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        // Add hover effects
        this.element.addEventListener('mouseenter', () => {
            this.element.style.transform = 'translateY(-4px)';
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.element.style.transform = 'translateY(0)';
        });
    }
}

class ModalComponent {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        const openButtons = document.querySelectorAll(`[data-modal-open="${this.element.id}"]`);
        const closeButtons = this.element.querySelectorAll('[data-modal-close]');
        
        openButtons.forEach(btn => {
            btn.addEventListener('click', () => this.open());
        });
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
        
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.close();
            }
        });
    }
    
    open() {
        this.element.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.element.classList.remove('active');
        document.body.style.overflow = '';
    }
}

class ToastComponent {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

class DropdownComponent {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        const toggle = this.element.querySelector('[data-dropdown-toggle]');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        
        document.addEventListener('click', () => {
            this.close();
        });
    }
    
    toggle() {
        this.element.classList.toggle('active');
    }
    
    close() {
        this.element.classList.remove('active');
    }
}

class TabsComponent {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        const tabs = this.element.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }
    
    switchTab(tabId) {
        // Hide all tab panels
        this.element.querySelectorAll('[data-tab-panel]').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Remove active from all tabs
        this.element.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected panel
        const panel = this.element.querySelector(`[data-tab-panel="${tabId}"]`);
        const tab = this.element.querySelector(`[data-tab="${tabId}"]`);
        
        if (panel) panel.classList.add('active');
        if (tab) tab.classList.add('active');
    }
}

// Utility Functions
HTMLElement.prototype.setLoading = function(loading) {
    if (loading) {
        this.disabled = true;
        this.dataset.originalText = this.textContent;
        this.innerHTML = '<span class="spinner"></span> Yükleniyor...';
    } else {
        this.disabled = false;
        this.textContent = this.dataset.originalText || '';
    }
};

// API Helper
const API = {
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            credentials: 'same-origin'
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            ToastComponent.show(error.message, 'error');
            throw error;
        }
    },
    
    getCSRFToken() {
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
        return cookie ? cookie.split('=')[1] : '';
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.Toast = ToastComponent;
    window.API = API;
});
