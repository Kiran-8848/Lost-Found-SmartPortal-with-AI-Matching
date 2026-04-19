/**
 * 🌍 Lost & Found Smart Portal - Admin Module
 */

class AdminModule {
    /**
     * Render Admin Dashboard
     */
    static async renderAdmin(container) {
        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>⚙️ Admin Dashboard</h1>
                </div>

                <div class="tabs">
                    <button class="tab-btn active" onclick="AdminModule.switchTab('overview', this)">📊 Overview</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('users', this)">👥 Users</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('items', this)">📦 Items</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('claims', this)">🛡 Claims</button>
                </div>

                <div id="admin-content">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        this.loadOverview();
    }

    static switchTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        switch (tab) {
            case 'overview': this.loadOverview(); break;
            case 'users': this.loadUsers(); break;
            case 'items': this.loadItems(); break;
            case 'claims': this.loadClaims(); break;
        }
    }

    static async loadOverview() {
        const contentDiv = document.getElementById('admin-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getAdminDashboard();
            const stats = data.stats;

            contentDiv.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon users">👥</div>
                        <div class="stat-info">
                            <h3>${stats.total_users}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon lost">📢</div>
                        <div class="stat-info">
                            <h3>${stats.total_lost}</h3>
                            <p>Lost Items</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon found">🎁</div>
                        <div class="stat-info">
                            <h3>${stats.total_found}</h3>
                            <p>Found Items</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon resolved">✅</div>
                        <div class="stat-info">
                            <h3>${stats.total_resolved}</h3>
                            <p>Resolved</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon claims">⏳</div>
                        <div class="stat-info">
                            <h3>${stats.total_pending_claims}</h3>
                            <p>Pending Claims</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon matched">📈</div>
                        <div class="stat-info">
                            <h3>${stats.resolution_rate}%</h3>
                            <p>Resolution Rate</p>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="card">
                        <h3>📋 Recent Items</h3>
                        <div style="margin-top: 16px;">
                            ${data.recent_items.map(item => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--light);">
                                    <div>
                                        <strong style="font-size: 0.9rem;">${Utils.escapeHtml(item.name)}</strong>
                                        <br><span style="font-size: 0.75rem; color: var(--gray);">by ${Utils.escapeHtml(item.username)}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        ${Utils.getStatusBadge(item.item_type)}
                                        <br><span style="font-size: 0.7rem; color: var(--gray);">${Utils.timeAgo(item.created_at)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="card">
                        <h3>🛡 Recent Claims</h3>
                        <div style="margin-top: 16px;">
                            ${data.recent_claims.map(claim => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--light);">
                                    <div>
                                        <strong style="font-size: 0.9rem;">${Utils.escapeHtml(claim.item_name || 'Claim')}</strong>
                                        <br><span style="font-size: 0.75rem; color: var(--gray);">by ${Utils.escapeHtml(claim.claimer_username)}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        ${Utils.getStatusBadge(claim.status)}
                                        <br><span style="font-size: 0.7rem; color: var(--gray);">${Utils.timeAgo(claim.created_at)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            contentDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    static async loadUsers() {
        const contentDiv = document.getElementById('admin-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getAdminUsers();

            contentDiv.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Items</th>
                                <th>Claims</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.users.map(user => `
                                <tr>
                                    <td><strong>@${Utils.escapeHtml(user.username)}</strong></td>
                                    <td style="font-size: 0.85rem;">${Utils.escapeHtml(user.email)}</td>
                                    <td>${Utils.escapeHtml(user.full_name || '—')}</td>
                                    <td>${user.role === 'admin'
                                        ? '<span class="badge badge-approved">ADMIN</span>'
                                        : '<span class="badge badge-pending">USER</span>'}</td>
                                    <td>${user.items_posted}</td>
                                    <td>${user.successful_claims}</td>
                                    <td>${user.is_active
                                        ? '<span class="badge badge-approved">Active</span>'
                                        : '<span class="badge badge-rejected">Inactive</span>'}</td>
                                    <td>
                                        <button class="btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-secondary'}"
                                            onclick="AdminModule.toggleUser('${user.id}')">
                                            ${user.is_active ? '⏸ Deactivate' : '▶️ Activate'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            contentDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    static async loadItems() {
        const contentDiv = document.getElementById('admin-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getAdminItems();

            contentDiv.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Location</th>
                                <th>User</th>
                                <th>Matches</th>
                                <th>Claims</th>
                                <th>Status</th>
                                <th>Posted</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(item => `
                                <tr onclick="window.location.hash='#/item/${item.id}'" style="cursor: pointer;">
                                    <td><strong>${Utils.escapeHtml(item.name)}</strong></td>
                                    <td>${Utils.getStatusBadge(item.item_type)}</td>
                                    <td>${Utils.escapeHtml(item.category)}</td>
                                    <td style="font-size: 0.85rem;">${Utils.escapeHtml(item.location)}</td>
                                    <td>@${Utils.escapeHtml(item.username)}</td>
                                    <td>${item.matches_count}</td>
                                    <td>${item.claims_count}</td>
                                    <td>${item.is_resolved
                                        ? '<span class="badge badge-returned">Resolved</span>'
                                        : Utils.getStatusBadge(item.status)}</td>
                                    <td style="font-size: 0.8rem;">${Utils.timeAgo(item.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            contentDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    static async loadClaims() {
        const contentDiv = document.getElementById('admin-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getAdminClaims();

            contentDiv.innerHTML = `
                <div style="margin-bottom: 16px; display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" onclick="AdminModule.filterClaims('')">All</button>
                    <button class="btn btn-sm btn-warning" onclick="AdminModule.filterClaims('pending')">Pending</button>
                    <button class="btn btn-sm btn-secondary" onclick="AdminModule.filterClaims('approved')">Approved</button>
                    <button class="btn btn-sm btn-danger" onclick="AdminModule.filterClaims('rejected')">Rejected</button>
                </div>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Claimer</th>
                                <th>Description</th>
                                <th>Proof</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.claims.map(claim => `
                                <tr>
                                    <td>
                                        <a href="#/item/${claim.item_id}">${Utils.escapeHtml(claim.item_name || 'View')}</a>
                                        <br><span class="badge badge-${claim.item_type}" style="font-size: 0.6rem;">${claim.item_type || ''}</span>
                                    </td>
                                    <td>@${Utils.escapeHtml(claim.claimer_username)}</td>
                                    <td style="max-width: 200px; font-size: 0.85rem;">
                                        ${Utils.escapeHtml(claim.description).substring(0, 100)}...
                                    </td>
                                    <td>
                                        ${claim.proof_image
                                            ? `<a href="${API.getImageUrl(claim.proof_image)}" target="_blank">📸 View</a>`
                                            : '—'}
                                    </td>
                                    <td>${Utils.getStatusBadge(claim.status)}</td>
                                    <td style="font-size: 0.8rem;">${Utils.timeAgo(claim.created_at)}</td>
                                    <td>
                                        ${claim.status === 'pending' ? `
                                            <div style="display: flex; gap: 4px;">
                                                <button class="btn btn-secondary btn-sm"
                                                    onclick="AdminModule.respondClaim('${claim.id}', 'approve')">✅</button>
                                                <button class="btn btn-danger btn-sm"
                                                    onclick="AdminModule.respondClaim('${claim.id}', 'reject')">❌</button>
                                            </div>
                                        ` : '—'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            contentDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    static async toggleUser(userId) {
        if (!confirm('Toggle user active status?')) return;

        try {
            const data = await API.toggleUser(userId);
            Toast.show(data.message, 'success');
            this.loadUsers();
        } catch (error) {
            Toast.show(error.message, 'error');
        }
    }

    static async respondClaim(claimId, action) {
        const notes = prompt(`Admin ${action} notes (optional):`);
        if (notes === null) return;

        try {
            await API.respondToClaim(claimId, action, notes);
            Toast.show(`Claim ${action}d successfully`, 'success');
            this.loadClaims();
        } catch (error) {
            Toast.show(error.message, 'error');
        }
    }

    static async filterClaims(status) {
        const contentDiv = document.getElementById('admin-content');
        // Keep filter buttons, replace table
        try {
            const data = await API.getAdminClaims(status);
            // Re-render claims tab with filtered data
            this.loadClaims();
        } catch (error) {
            Toast.show(error.message, 'error');
        }
    }
}

window.AdminModule = AdminModule;