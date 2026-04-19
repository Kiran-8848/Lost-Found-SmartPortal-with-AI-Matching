/**
 * 🌍 Lost & Found Smart Portal - Main App Module
 * Handles routing, navigation, and page rendering
 */

class App {
    constructor() {
        this.currentPage = '';
        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.router());
        document.addEventListener('DOMContentLoaded', () => {
            this.router();
        });

        // Also run immediately
        this.router();
    }

    /**
     * Simple hash-based router
     */
    router() {
        const hash = window.location.hash || '#/';
        const path = hash.replace('#', '');

        // Parse route and params
        const parts = path.split('/').filter(Boolean);
        const route = '/' + (parts[0] || '');
        const param = parts[1] || '';

        this.renderNavbar();

        switch (route) {
            case '/':
                this.loadPage('dashboard');
                break;
            case '/login':
                this.loadPage('login');
                break;
            case '/signup':
                this.loadPage('signup');
                break;
            case '/dashboard':
                this.loadPage('dashboard');
                break;
            case '/post-lost':
                this.requireAuth(() => this.loadPage('post-item', { type: 'lost' }));
                break;
            case '/post-found':
                this.requireAuth(() => this.loadPage('post-item', { type: 'found' }));
                break;
            case '/items':
                this.loadPage('browse-items', { filter: param });
                break;
            case '/item':
                this.loadPage('item-detail', { id: param });
                break;
            case '/my-items':
                this.requireAuth(() => this.loadPage('my-items'));
                break;
            case '/matches':
                this.requireAuth(() => this.loadPage('matches', { id: param }));
                break;
            case '/claims':
                this.requireAuth(() => this.loadPage('claims'));
                break;
            case '/chat':
                this.requireAuth(() => this.loadPage('chat', { userId: param }));
                break;
            case '/profile':
                this.requireAuth(() => this.loadPage('profile'));
                break;
            case '/admin':
                this.requireAdmin(() => this.loadPage('admin'));
                break;
            default:
                this.loadPage('dashboard');
        }
    }

    requireAuth(callback) {
        if (!API.isLoggedIn()) {
            Toast.show('Please login to continue', 'error');
            window.location.hash = '#/login';
            return;
        }
        callback();
    }

    requireAdmin(callback) {
        if (!API.isAdmin()) {
            Toast.show('Admin access required', 'error');
            window.location.hash = '#/';
            return;
        }
        callback();
    }

    /**
     * Render the navigation bar
     */
    renderNavbar() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        const user = API.getUser();
        const isLoggedIn = API.isLoggedIn();
        const currentHash = window.location.hash;

        let navLinks = '';

        if (isLoggedIn) {
            navLinks = `
                <a href="#/dashboard" class="${currentHash === '#/dashboard' || currentHash === '#/' ? 'active' : ''}">🏠 Home</a>
                <a href="#/items" class="${currentHash.startsWith('#/items') ? 'active' : ''}">🔍 Browse</a>
                <a href="#/post-lost" class="${currentHash === '#/post-lost' ? 'active' : ''}">📢 Report Lost</a>
                <a href="#/post-found" class="${currentHash === '#/post-found' ? 'active' : ''}">🎁 Report Found</a>
                <a href="#/my-items" class="${currentHash === '#/my-items' ? 'active' : ''}">📦 My Items</a>
                <a href="#/claims" class="${currentHash === '#/claims' ? 'active' : ''}">🛡 Claims</a>
                <a href="#/chat" class="${currentHash.startsWith('#/chat') ? 'active' : ''}">💬 Chat</a>
                ${user && user.role === 'admin' ? `<a href="#/admin" class="${currentHash === '#/admin' ? 'active' : ''}">⚙️ Admin</a>` : ''}
                <a href="#/profile" class="${currentHash === '#/profile' ? 'active' : ''}">
                    <span class="user-badge">
                        <span class="avatar">${(user?.username || 'U')[0].toUpperCase()}</span>
                        ${user?.username || 'User'}
                    </span>
                </a>
                <button onclick="API.logout()" class="btn btn-sm btn-outline">Logout</button>
            `;
        } else {
            navLinks = `
                <a href="#/dashboard" class="${currentHash === '#/dashboard' || currentHash === '#/' ? 'active' : ''}">🏠 Home</a>
                <a href="#/items" class="${currentHash.startsWith('#/items') ? 'active' : ''}">🔍 Browse</a>
                <a href="#/login" class="${currentHash === '#/login' ? 'active' : ''}">🔑 Login</a>
                <a href="#/signup" class="btn btn-sm btn-primary">Sign Up</a>
            `;
        }

        navbar.innerHTML = `
            <div class="logo" onclick="window.location.hash='#/'">
                <span>🌍</span> Lost & Found
            </div>
            <button class="mobile-menu-toggle" onclick="document.querySelector('.nav-links').classList.toggle('show')">☰</button>
            <nav class="nav-links">
                ${navLinks}
            </nav>
        `;
    }

    /**
     * Load and render a page
     */
    loadPage(pageName, params = {}) {
        this.currentPage = pageName;
        const content = document.getElementById('app-content');
        if (!content) return;

        switch (pageName) {
            case 'login':
                AuthModule.renderLogin(content);
                break;
            case 'signup':
                AuthModule.renderSignup(content);
                break;
            case 'dashboard':
                ItemsModule.renderDashboard(content);
                break;
            case 'post-item':
                ItemsModule.renderPostItem(content, params.type);
                break;
            case 'browse-items':
                ItemsModule.renderBrowseItems(content, params.filter);
                break;
            case 'item-detail':
                ItemsModule.renderItemDetail(content, params.id);
                break;
            case 'my-items':
                ItemsModule.renderMyItems(content);
                break;
            case 'matches':
                ItemsModule.renderMatches(content, params.id);
                break;
            case 'claims':
                ClaimsModule.renderClaims(content);
                break;
            case 'chat':
                ChatModule.renderChat(content, params.userId);
                break;
            case 'profile':
                AuthModule.renderProfile(content);
                break;
            case 'admin':
                AdminModule.renderAdmin(content);
                break;
            default:
                content.innerHTML = '<div class="container"><h1>Page Not Found</h1></div>';
        }
    }
}

/**
 * Toast Notification System
 */
class Toast {
    static show(message, type = 'info', duration = 4000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

/**
 * Utility functions
 */
class Utils {
    static formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    }

    static timeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return Utils.formatDate(dateStr);
    }

    static getCategoryIcon(category) {
        const icons = {
            'Electronics': '📱',
            'Documents': '📄',
            'Keys': '🔑',
            'Wallet/Purse': '👛',
            'Clothing': '👕',
            'Jewelry': '💍',
            'Bags/Backpack': '🎒',
            'Books': '📚',
            'Sports Equipment': '⚽',
            'Musical Instrument': '🎸',
            'Pet': '🐾',
            'Other': '📦',
        };
        return icons[category] || '📦';
    }

    static getScoreColor(score) {
        if (score >= 70) return 'score-high';
        if (score >= 40) return 'score-medium';
        return 'score-low';
    }

    static getStatusBadge(status) {
        return `<span class="badge badge-${status}">${status.toUpperCase()}</span>`;
    }

    static escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize app
const app = new App();

// Make utilities global
window.Toast = Toast;
window.Utils = Utils;