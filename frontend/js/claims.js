/**
 * 🌍 Lost & Found Smart Portal - Claims Module
 */

class ClaimsModule {
    /**
     * Render Claims Page
     */
    static async renderClaims(container) {
        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>🛡 Claims Management</h1>
                </div>

                <div class="tabs">
                    <button class="tab-btn active" onclick="ClaimsModule.switchTab('received', this)">
                        📥 Received Claims
                    </button>
                    <button class="tab-btn" onclick="ClaimsModule.switchTab('sent', this)">
                        📤 My Claims
                    </button>
                </div>

                <div id="claims-content">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        this.loadReceivedClaims();
    }

    static switchTab(tab, btn) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (tab === 'received') {
            this.loadReceivedClaims();
        } else {
            this.loadMyClaims();
        }
    }

    static async loadReceivedClaims() {
        const contentDiv = document.getElementById('claims-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getReceivedClaims();

            if (!data.claims || data.claims.length === 0) {
                contentDiv.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📥</div>
                        <h3>No claims received</h3>
                        <p>When someone claims your items, they'll appear here.</p>
                    </div>
                `;
                return;
            }

            contentDiv.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Claimer</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.claims.map(claim => `
                                <tr>
                                    <td>
                                        <strong>${Utils.escapeHtml(claim.item_name || 'Item')}</strong>
                                        <br><span class="badge badge-${claim.item_type || 'lost'}" style="font-size: 0.65rem;">${claim.item_type || 'item'}</span>
                                    </td>
                                    <td>
                                        👤 ${Utils.escapeHtml(claim.claimer_username)}
                                        <br>
                                        <a href="#/chat/${claim.claimer_id}" style="font-size: 0.8rem;">💬 Chat</a>
                                    </td>
                                    <td style="max-width: 250px;">
                                        <p style="font-size: 0.85rem;">${Utils.escapeHtml(claim.description)}</p>
                                        ${claim.proof_image ? `
                                            <a href="${API.getImageUrl(claim.proof_image)}" target="_blank"
                                                style="font-size: 0.8rem;">📸 View Proof</a>
                                        ` : ''}
                                    </td>
                                    <td>${Utils.getStatusBadge(claim.status)}</td>
                                    <td style="font-size: 0.8rem;">${Utils.timeAgo(claim.created_at)}</td>
                                    <td>
                                        ${claim.status === 'pending' ? `
                                            <div style="display: flex; gap: 6px; flex-direction: column;">
                                                <button class="btn btn-secondary btn-sm"
                                                    onclick="ClaimsModule.respondClaim('${claim.id}', 'approve')">
                                                    ✅ Approve
                                                </button>
                                                <button class="btn btn-danger btn-sm"
                                                    onclick="ClaimsModule.respondClaim('${claim.id}', 'reject')">
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        ` : `<span style="font-size: 0.8rem; color: var(--gray);">—</span>`}
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

    static async loadMyClaims() {
        const contentDiv = document.getElementById('claims-content');
        contentDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const data = await API.getMyClaims();

            if (!data.claims || data.claims.length === 0) {
                contentDiv.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📤</div>
                        <h3>No claims made</h3>
                        <p>When you claim an item, it will appear here.</p>
                        <a href="#/items" class="btn btn-primary">Browse Items</a>
                    </div>
                `;
                return;
            }

            contentDiv.innerHTML = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>My Description</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.claims.map(claim => `
                                <tr>
                                    <td>
                                        <a href="#/item/${claim.item_id}">
                                            <strong>${Utils.escapeHtml(claim.item_name || 'View Item')}</strong>
                                        </a>
                                    </td>
                                    <td style="max-width: 250px; font-size: 0.85rem;">
                                        ${Utils.escapeHtml(claim.description)}
                                        ${claim.proof_image ? `
                                            <br><a href="${API.getImageUrl(claim.proof_image)}" target="_blank"
                                                style="font-size: 0.8rem;">📸 Proof</a>
                                        ` : ''}
                                    </td>
                                    <td>${Utils.getStatusBadge(claim.status)}</td>
                                    <td style="font-size: 0.8rem;">${Utils.timeAgo(claim.created_at)}</td>
                                    <td style="font-size: 0.85rem; color: var(--gray);">
                                        ${claim.admin_notes ? Utils.escapeHtml(claim.admin_notes) : '—'}
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

    static async respondClaim(claimId, action) {
        const actionText = action === 'approve' ? 'approve' : 'reject';
        const notes = prompt(`${action === 'approve' ? '✅' : '❌'} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} this claim?\n\nAdd optional notes:`);

        if (notes === null) return; // User cancelled

        try {
            await API.respondToClaim(claimId, action, notes);
            Toast.show(`Claim ${actionText}d successfully!`, action === 'approve' ? 'success' : 'info');
            this.loadReceivedClaims();
        } catch (error) {
            Toast.show(error.message, 'error');
        }
    }
}

window.ClaimsModule = ClaimsModule;