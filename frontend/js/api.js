/**
 * 🌍 Lost & Found Smart Portal - API Module
 * Handles all HTTP requests to the backend
 */

const API_BASE = 'http://localhost:5000/api';
const UPLOADS_BASE = 'http://localhost:5000/uploads';

class API {
    /**
     * Get stored auth token
     */
    static getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Get stored user data
     */
    static getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Check if user is logged in
     */
    static isLoggedIn() {
        return !!this.getToken();
    }

    /**
     * Check if user is admin
     */
    static isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    /**
     * Build headers for requests
     */
    static getHeaders(isFormData = false) {
        const headers = {};
        const token = this.getToken();

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    }

    /**
     * Generic fetch wrapper
     */
    static async request(endpoint, options = {}) {
        try {
            const url = `${API_BASE}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getHeaders(options.isFormData),
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ==================== AUTH ====================

    static async signup(userData) {
        const data = await this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    static async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '#/login';
    }

    static async getProfile() {
        return this.request('/auth/profile');
    }

    static async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    // ==================== ITEMS ====================

    static async postItem(formData) {
        const response = await fetch(`${API_BASE}/items/post`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to post item');
        return data;
    }

    static async getAllItems(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/items/all?${query}`);
    }

    static async getItem(itemId) {
        return this.request(`/items/${itemId}`);
    }

    static async getMyItems() {
        return this.request('/items/my-items');
    }

    static async getItemMatches(itemId) {
        return this.request(`/items/${itemId}/matches`);
    }

    static async updateItem(itemId, updateData) {
        return this.request(`/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
    }

    static async deleteItem(itemId) {
        return this.request(`/items/${itemId}`, {
            method: 'DELETE',
        });
    }

    // ==================== CLAIMS ====================

    static async submitClaim(formData) {
        const response = await fetch(`${API_BASE}/claims/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit claim');
        return data;
    }

    static async getMyClaims() {
        return this.request('/claims/my-claims');
    }

    static async getReceivedClaims() {
        return this.request('/claims/received');
    }

    static async respondToClaim(claimId, action, notes = '') {
        return this.request(`/claims/${claimId}/respond`, {
            method: 'PUT',
            body: JSON.stringify({ action, notes }),
        });
    }

    // ==================== CHAT ====================

    static async sendMessage(receiverId, content, itemId = '') {
        return this.request('/chat/send', {
            method: 'POST',
            body: JSON.stringify({
                receiver_id: receiverId,
                content: content,
                item_id: itemId,
            }),
        });
    }

    static async getConversation(otherUserId, itemId = '') {
        const query = itemId ? `?item_id=${itemId}` : '';
        return this.request(`/chat/conversation/${otherUserId}${query}`);
    }

    static async getAllConversations() {
        return this.request('/chat/conversations');
    }

    // ==================== ADMIN ====================

    static async getAdminDashboard() {
        return this.request('/admin/dashboard');
    }

    static async getAdminUsers(page = 1) {
        return this.request(`/admin/users?page=${page}`);
    }

    static async toggleUser(userId) {
        return this.request(`/admin/users/${userId}/toggle`, {
            method: 'PUT',
        });
    }

    static async getAdminClaims(status = '') {
        const query = status ? `?status=${status}` : '';
        return this.request(`/admin/claims${query}`);
    }

    static async getAdminItems() {
        return this.request('/admin/items');
    }

    // ==================== HELPERS ====================

    static getImageUrl(filename) {
        if (!filename) return '';
        return `${UPLOADS_BASE}/${filename}`;
    }
}

// Make it globally accessible
window.API = API;