/**
 * Lost & Found Smart Portal - Items Module (FIXED)
 * Fixed: Claim button on matches + item detail pages
 */

const CATEGORIES = [
    'Electronics', 'Documents', 'Keys', 'Wallet/Purse', 'Clothing',
    'Jewelry', 'Bags/Backpack', 'Books', 'Sports Equipment',
    'Musical Instrument', 'Pet', 'Other'
];

class ItemsModule {
    /**
     * Render Dashboard / Home Page
     */
    static async renderDashboard(container) {
        container.innerHTML = `
            <div class="container">
                <div class="hero">
                    <h1>🌍 Lost & Found Smart Portal</h1>
                    <p>Lost something? Found something? Our AI-powered platform helps reunite people with their belongings using smart matching technology.</p>
                    <div class="hero-buttons">
                        <a href="#/post-lost" class="btn btn-lost btn-lg">📢 Report Lost Item</a>
                        <a href="#/post-found" class="btn btn-found btn-lg">🎁 Report Found Item</a>
                        <a href="#/items" class="btn btn-outline btn-lg" style="border-color: white; color: white;">🔍 Browse All</a>
                    </div>
                </div>

                <div id="dashboard-stats" class="stats-grid"></div>

                <div class="page-header">
                    <h2>📋 Recent Items</h2>
                    <a href="#/items" class="btn btn-outline btn-sm">View All →</a>
                </div>

                <div id="recent-items" class="items-grid">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        try {
            const [lostData, foundData] = await Promise.all([
                API.getAllItems({ type: 'lost', limit: 3 }),
                API.getAllItems({ type: 'found', limit: 3 }),
            ]);

            const statsDiv = document.getElementById('dashboard-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon lost">📢</div>
                        <div class="stat-info">
                            <h3>${lostData.total}</h3>
                            <p>Lost Items</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon found">🎁</div>
                        <div class="stat-info">
                            <h3>${foundData.total}</h3>
                            <p>Found Items</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon matched">🤖</div>
                        <div class="stat-info">
                            <h3>AI</h3>
                            <p>Smart Matching</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon resolved">✅</div>
                        <div class="stat-info">
                            <h3>24/7</h3>
                            <p>Available</p>
                        </div>
                    </div>
                `;
            }

            const allItems = [...lostData.items, ...foundData.items]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 6);

            this.renderItemsGrid('recent-items', allItems);
        } catch (error) {
            document.getElementById('recent-items').innerHTML = `
                <div class="alert alert-error">❌ Failed to load items: ${error.message}</div>
            `;
        }
    }

    /**
     * Render Post Item Form
     */
    static renderPostItem(container, itemType) {
        const isLost = itemType === 'lost';
        const title = isLost ? '📢 Report Lost Item' : '🎁 Report Found Item';
        const color = isLost ? 'var(--danger)' : 'var(--secondary)';

        const categoryOptions = CATEGORIES.map(c =>
            `<option value="${c}">${Utils.getCategoryIcon(c)} ${c}</option>`
        ).join('');

        container.innerHTML = `
            <div class="container">
                <div style="max-width: 700px; margin: 0 auto;">
                    <div class="page-header">
                        <h1>${title}</h1>
                    </div>

                    <div class="card">
                        <div id="post-alert"></div>

                        <form id="post-item-form">
                            <input type="hidden" id="item-type" value="${itemType}">

                            <div class="form-group">
                                <label>📦 Item Name *</label>
                                <input type="text" class="form-control" id="item-name"
                                    placeholder="e.g., Black iPhone 14, Blue Backpack" required>
                            </div>

                            <div class="form-group">
                                <label>📝 Description *</label>
                                <textarea class="form-control" id="item-description"
                                    placeholder="Describe the item in detail - color, size, brand, distinctive features..."
                                    required></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>📂 Category *</label>
                                    <select class="form-control" id="item-category" required>
                                        <option value="">Select category</option>
                                        ${categoryOptions}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>📅 Date ${isLost ? 'Lost' : 'Found'} *</label>
                                    <input type="date" class="form-control" id="item-date"
                                        value="${new Date().toISOString().split('T')[0]}" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>📍 Location *</label>
                                <input type="text" class="form-control" id="item-location"
                                    placeholder="e.g., Library Building, Main Campus, Park Street" required>
                            </div>

                            <div class="form-group">
                                <label>📞 Contact Info (optional)</label>
                                <input type="text" class="form-control" id="item-contact"
                                    placeholder="Phone or email for direct contact">
                            </div>

                            ${isLost ? `
                                <div class="form-group">
                                    <label>💰 Reward (optional)</label>
                                    <input type="text" class="form-control" id="item-reward"
                                        placeholder="e.g., $50 reward">
                                </div>
                            ` : ''}

                            <div class="form-group">
                                <label>📸 Item Image (optional)</label>
                                <div class="file-upload" id="file-upload-area">
                                    <input type="file" id="item-image" accept="image/*">
                                    <div class="upload-icon">📷</div>
                                    <div class="upload-text">Click or drag to upload an image</div>
                                    <div class="file-name" id="file-name"></div>
                                    <img id="image-preview" class="image-preview" style="display: none;">
                                </div>
                            </div>

                            <button type="submit" class="btn btn-lg btn-block"
                                style="background: ${color}; color: white;" id="post-btn">
                                ${isLost ? '📢 Post Lost Item' : '🎁 Post Found Item'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Image preview
        document.getElementById('item-image').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('file-name').textContent = file.name;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById('image-preview');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Form submission
        document.getElementById('post-item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('post-btn');
            const alertDiv = document.getElementById('post-alert');

            btn.disabled = true;
            btn.textContent = '⏳ Posting & Finding Matches...';
            alertDiv.innerHTML = '';

            try {
                const formData = new FormData();
                formData.append('item_type', document.getElementById('item-type').value);
                formData.append('name', document.getElementById('item-name').value);
                formData.append('description', document.getElementById('item-description').value);
                formData.append('category', document.getElementById('item-category').value);
                formData.append('location', document.getElementById('item-location').value);
                formData.append('date_occurred', document.getElementById('item-date').value);
                formData.append('contact_info', document.getElementById('item-contact').value);

                const rewardEl = document.getElementById('item-reward');
                if (rewardEl) formData.append('reward', rewardEl.value);

                const imageFile = document.getElementById('item-image').files[0];
                if (imageFile) formData.append('image', imageFile);

                const data = await API.postItem(formData);

                let matchMessage = '';
                if (data.matches_found > 0) {
                    matchMessage = `
                        <div class="alert alert-info" style="margin-top: 16px;">
                            🤖 <strong>${data.matches_found} possible match${data.matches_found > 1 ? 'es' : ''} found!</strong>
                            <a href="#/matches/${data.item_id}" class="btn btn-sm btn-primary" style="margin-left: 10px;">
                                View Matches →
                            </a>
                        </div>
                    `;
                }

                alertDiv.innerHTML = `
                    <div class="alert alert-success">✅ ${data.message}</div>
                    ${matchMessage}
                `;

                Toast.show(data.message, 'success');

                if (data.matches_found > 0) {
                    Toast.show(`🤖 ${data.matches_found} possible matches found!`, 'info');
                    setTimeout(() => {
                        window.location.hash = `#/matches/${data.item_id}`;
                    }, 2000);
                } else {
                    setTimeout(() => {
                        window.location.hash = '#/my-items';
                    }, 2000);
                }
            } catch (error) {
                alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                btn.disabled = false;
                btn.textContent = isLost ? '📢 Post Lost Item' : '🎁 Post Found Item';
            }
        });
    }

    /**
     * Render Browse Items Page
     */
    static async renderBrowseItems(container, initialFilter = '') {
        const categoryOptions = CATEGORIES.map(c =>
            `<option value="${c}">${c}</option>`
        ).join('');

        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>🔍 Browse Items</h1>
                </div>

                <div class="filter-bar">
                    <div class="search-box">
                        <input type="text" id="search-input" placeholder="Search items...">
                    </div>
                    <select id="filter-type">
                        <option value="">All Types</option>
                        <option value="lost" ${initialFilter === 'lost' ? 'selected' : ''}>📢 Lost</option>
                        <option value="found" ${initialFilter === 'found' ? 'selected' : ''}>🎁 Found</option>
                    </select>
                    <select id="filter-category">
                        <option value="">All Categories</option>
                        ${categoryOptions}
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="ItemsModule.applyFilters()">
                        🔍 Search
                    </button>
                </div>

                <div id="items-count" style="margin-bottom: 16px; color: var(--gray); font-size: 0.9rem;"></div>

                <div id="browse-items" class="items-grid">
                    <div class="loading"><div class="spinner"></div></div>
                </div>

                <div id="pagination" style="text-align: center; margin-top: 24px;"></div>
            </div>
        `;

        document.getElementById('search-input').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });

        this.applyFilters();
    }

    static async applyFilters(page = 1) {
        const search = document.getElementById('search-input')?.value || '';
        const type = document.getElementById('filter-type')?.value || '';
        const category = document.getElementById('filter-category')?.value || '';

        const itemsDiv = document.getElementById('browse-items');
        if (itemsDiv) {
            itemsDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }

        try {
            const params = { page, limit: 12 };
            if (search) params.search = search;
            if (type) params.type = type;
            if (category) params.category = category;

            const data = await API.getAllItems(params);

            const countDiv = document.getElementById('items-count');
            if (countDiv) {
                countDiv.textContent = `Showing ${data.items.length} of ${data.total} items`;
            }

            this.renderItemsGrid('browse-items', data.items);

            const pagDiv = document.getElementById('pagination');
            if (pagDiv && data.pages > 1) {
                let html = '';
                for (let i = 1; i <= data.pages; i++) {
                    html += `
                        <button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline'}"
                            onclick="ItemsModule.applyFilters(${i})" style="margin: 0 4px;">
                            ${i}
                        </button>
                    `;
                }
                pagDiv.innerHTML = html;
            }
        } catch (error) {
            if (itemsDiv) {
                itemsDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
            }
        }
    }

    /**
     * Render Items Grid
     */
    static renderItemsGrid(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">🔍</div>
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filters</p>
                    <a href="#/post-lost" class="btn btn-primary">Report a Lost Item</a>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="item-card" onclick="window.location.hash='#/item/${item.id}'">
                ${item.image
                ? `<div class="item-image"><img src="${API.getImageUrl(item.image)}" alt="${Utils.escapeHtml(item.name)}" loading="lazy"></div>`
                : `<div class="no-image">${Utils.getCategoryIcon(item.category)}</div>`
            }
                <div class="item-body">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <span class="badge badge-${item.item_type}">${item.item_type}</span>
                        ${item.matches_count > 0 ? `<span class="badge badge-matched">🤖 ${item.matches_count} matches</span>` : ''}
                    </div>
                    <h3 class="item-title">${Utils.escapeHtml(item.name)}</h3>
                    <div class="item-meta">
                        <span>📂 ${Utils.escapeHtml(item.category)}</span>
                        <span>📍 ${Utils.escapeHtml(item.location)}</span>
                        <span>📅 ${Utils.formatDate(item.date_occurred)}</span>
                    </div>
                    <p class="item-desc">${Utils.escapeHtml(item.description)}</p>
                    <div class="item-footer">
                        <span style="font-size: 0.8rem; color: var(--gray);">
                            👤 ${Utils.escapeHtml(item.username)} • ${Utils.timeAgo(item.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render Item Detail Page - FIXED WITH CLAIM BUTTON
     */
    static async renderItemDetail(container, itemId) {
        container.innerHTML = `
            <div class="container">
                <div class="loading"><div class="spinner"></div></div>
            </div>
        `;

        try {
            const data = await API.getItem(itemId);
            const item = data.item;
            const currentUser = API.getUser();
            const isLoggedIn = API.isLoggedIn();
            const isOwner = currentUser && currentUser.id === item.user_id;

            container.innerHTML = `
                <div class="container">
                    <a href="#/items" style="color: var(--gray); font-size: 0.9rem;">← Back to Browse</a>

                    <div class="detail-container" style="margin-top: 16px;">
                        <div class="detail-image">
                            ${item.image
                    ? `<img src="${API.getImageUrl(item.image)}" alt="${Utils.escapeHtml(item.name)}">`
                    : `<div class="no-image">${Utils.getCategoryIcon(item.category)}</div>`
                }
                        </div>

                        <div class="detail-info card">
                            <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                                ${Utils.getStatusBadge(item.item_type)}
                                ${Utils.getStatusBadge(item.status)}
                                ${item.is_resolved ? '<span class="badge badge-returned">✅ RESOLVED</span>' : ''}
                            </div>

                            <h2 style="margin-bottom: 20px;">${Utils.escapeHtml(item.name)}</h2>

                            <div class="info-row">
                                <span class="info-label">📝 Description</span>
                                <span class="info-value">${Utils.escapeHtml(item.description)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📂 Category</span>
                                <span class="info-value">${Utils.getCategoryIcon(item.category)} ${Utils.escapeHtml(item.category)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📍 Location</span>
                                <span class="info-value">${Utils.escapeHtml(item.location)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📅 Date</span>
                                <span class="info-value">${Utils.formatDate(item.date_occurred)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">👤 Posted by</span>
                                <span class="info-value">${Utils.escapeHtml(item.username)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">🕐 Posted</span>
                                <span class="info-value">${Utils.timeAgo(item.created_at)}</span>
                            </div>
                            ${item.contact_info ? `
                                <div class="info-row">
                                    <span class="info-label">📞 Contact</span>
                                    <span class="info-value">${Utils.escapeHtml(item.contact_info)}</span>
                                </div>
                            ` : ''}
                            ${item.reward ? `
                                <div class="info-row">
                                    <span class="info-label">💰 Reward</span>
                                    <span class="info-value" style="color: var(--warning); font-weight: 600;">
                                        ${Utils.escapeHtml(item.reward)}
                                    </span>
                                </div>
                            ` : ''}

                            <!-- ACTION BUTTONS -->
                            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">

                                ${(!isOwner && !item.is_resolved && isLoggedIn) ? `
                                    <button class="btn btn-primary btn-lg" onclick="ItemsModule.showClaimModal('${item.id}')">
                                        🛡 Claim This Item
                                    </button>
                                    <a href="#/chat/${item.user_id}" class="btn btn-outline">
                                        💬 Chat with ${item.item_type === 'lost' ? 'Owner' : 'Finder'}
                                    </a>
                                ` : ''}

                                ${isOwner ? `
                                    <a href="#/matches/${item.id}" class="btn btn-primary">
                                        🤖 View Matches (${item.matches.length})
                                    </a>
                                    <button class="btn btn-danger btn-sm" onclick="ItemsModule.deleteItem('${item.id}')">
                                        🗑 Delete
                                    </button>
                                ` : ''}

                                ${!isLoggedIn ? `
                                    <a href="#/login" class="btn btn-primary btn-lg">🔑 Login to Claim</a>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- MATCHES SECTION -->
                    ${item.matches.length > 0 ? `
                        <div class="matches-section" style="margin-top: 30px;">
                            <h3>🤖 Possible Matches (${item.matches.length})</h3>
                            <div id="match-cards">
                                ${item.matches.map(match => `
                                    <div class="match-card">
                                        ${match.image
                        ? `<img src="${API.getImageUrl(match.image)}" class="match-image" alt="">`
                        : `<div class="match-image" style="display: flex; align-items: center; justify-content: center; background: var(--light);">${Utils.getCategoryIcon(match.category)}</div>`
                    }
                                        <div class="match-info" style="flex: 1;">
                                            <h4>${Utils.escapeHtml(match.name)}</h4>
                                            <p>📂 ${Utils.escapeHtml(match.category)} • 📍 ${Utils.escapeHtml(match.location)}</p>
                                            <p>📅 ${Utils.formatDate(match.date_occurred)} • 👤 ${Utils.escapeHtml(match.username)}</p>
                                        </div>
                                        <div class="match-actions" style="display: flex; flex-direction: column; gap: 6px;">
                                            <span class="badge badge-${match.item_type}">${match.item_type}</span>
                                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); ItemsModule.showClaimModal('${match.id}')">
                                                🛡 Claim
                                            </button>
                                            <a href="#/chat/${match.user_id}" class="btn btn-outline btn-sm" onclick="event.stopPropagation();">
                                                💬 Chat
                                            </a>
                                            <a href="#/item/${match.id}" class="btn btn-sm" style="background: var(--light); color: var(--dark);" onclick="event.stopPropagation();">
                                                👁 View
                                            </a>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- CLAIM MODAL -->
                <div class="modal-overlay" id="claim-modal">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>🛡 Claim This Item</h3>
                            <button class="modal-close" onclick="document.getElementById('claim-modal').classList.remove('active')">✕</button>
                        </div>

                        <div class="alert alert-info" style="margin-bottom: 16px;">
                            ℹ️ To verify your ownership, please describe the item with details only the true owner would know.
                        </div>

                        <div id="claim-alert"></div>

                        <form id="claim-form">
                            <input type="hidden" id="claim-item-id" value="${item.id}">

                            <div class="form-group">
                                <label>📝 Ownership Proof Description *</label>
                                <textarea class="form-control" id="claim-description"
                                    placeholder="Describe details only the owner would know:&#10;- Serial number&#10;- Unique marks or scratches&#10;- What's inside (if bag/wallet)&#10;- Lock screen wallpaper (if phone)&#10;- Any distinctive features"
                                    required rows="5"></textarea>
                            </div>

                            <div class="form-group">
                                <label>📸 Upload Proof Image (optional)</label>
                                <div class="file-upload">
                                    <input type="file" id="claim-proof" accept="image/*">
                                    <div class="upload-icon">📷</div>
                                    <div class="upload-text">Upload photo proof (receipt, matching photo, etc.)</div>
                                    <div class="file-name" id="claim-file-name"></div>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary btn-block btn-lg" id="claim-btn">
                                📤 Submit Claim for Verification
                            </button>
                        </form>
                    </div>
                </div>
            `;

            // Claim proof file name display
            const claimProofInput = document.getElementById('claim-proof');
            if (claimProofInput) {
                claimProofInput.addEventListener('change', function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        document.getElementById('claim-file-name').textContent = file.name;
                    }
                });
            }

            // Claim form handler
            const claimForm = document.getElementById('claim-form');
            if (claimForm) {
                claimForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('claim-btn');
                    const alertDiv = document.getElementById('claim-alert');
                    const claimItemId = document.getElementById('claim-item-id').value;

                    btn.disabled = true;
                    btn.textContent = '⏳ Submitting claim...';

                    try {
                        const formData = new FormData();
                        formData.append('item_id', claimItemId);
                        formData.append('description', document.getElementById('claim-description').value);

                        const proofFile = document.getElementById('claim-proof').files[0];
                        if (proofFile) formData.append('proof_image', proofFile);

                        const result = await API.submitClaim(formData);
                        Toast.show('✅ ' + result.message, 'success');
                        document.getElementById('claim-modal').classList.remove('active');

                        alertDiv.innerHTML = '';

                        // Show success message on page
                        const successBanner = document.createElement('div');
                        successBanner.className = 'alert alert-success';
                        successBanner.innerHTML = `✅ ${result.message} <a href="#/claims">View your claims →</a>`;
                        container.querySelector('.container').prepend(successBanner);

                    } catch (error) {
                        alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '📤 Submit Claim for Verification';
                    }
                });
            }

        } catch (error) {
            container.innerHTML = `
                <div class="container">
                    <div class="alert alert-error">❌ Item not found: ${error.message}</div>
                    <a href="#/items" class="btn btn-primary">← Browse Items</a>
                </div>
            `;
        }
    }

    /**
     * Show Claim Modal - WORKS FOR ANY ITEM ID
     */
    static showClaimModal(itemId) {
        // Update the hidden item ID in the form
        const hiddenInput = document.getElementById('claim-item-id');
        if (hiddenInput) {
            hiddenInput.value = itemId;
        }

        // Clear previous form data
        const descInput = document.getElementById('claim-description');
        if (descInput) descInput.value = '';

        const alertDiv = document.getElementById('claim-alert');
        if (alertDiv) alertDiv.innerHTML = '';

        const fileName = document.getElementById('claim-file-name');
        if (fileName) fileName.textContent = '';

        // Show modal
        const modal = document.getElementById('claim-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Render My Items Page
     */
    static async renderMyItems(container) {
        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>📦 My Items</h1>
                    <div style="display: flex; gap: 10px;">
                        <a href="#/post-lost" class="btn btn-danger btn-sm">📢 Report Lost</a>
                        <a href="#/post-found" class="btn btn-secondary btn-sm">🎁 Report Found</a>
                    </div>
                </div>

                <div id="my-items-list" class="items-grid">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        try {
            const data = await API.getMyItems();
            const itemsDiv = document.getElementById('my-items-list');

            if (!data.items || data.items.length === 0) {
                itemsDiv.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-icon">📦</div>
                        <h3>No items posted yet</h3>
                        <p>Start by reporting a lost or found item</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <a href="#/post-lost" class="btn btn-danger">📢 Report Lost</a>
                            <a href="#/post-found" class="btn btn-secondary">🎁 Report Found</a>
                        </div>
                    </div>
                `;
                return;
            }

            this.renderItemsGrid('my-items-list', data.items);
        } catch (error) {
            document.getElementById('my-items-list').innerHTML = `
                <div class="alert alert-error">❌ ${error.message}</div>
            `;
        }
    }

    /**
     * Render Matches Page - FIXED WITH CLAIM BUTTONS
     */
    static async renderMatches(container, itemId) {
        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>🤖 AI Smart Matches</h1>
                    <a href="#/my-items" class="btn btn-outline btn-sm">← My Items</a>
                </div>
                <div id="matches-content">
                    <div class="loading"><div class="spinner"></div></div>
                </div>

                <!-- CLAIM MODAL FOR MATCHES PAGE -->
                <div class="modal-overlay" id="claim-modal">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>🛡 Claim This Item</h3>
                            <button class="modal-close" onclick="document.getElementById('claim-modal').classList.remove('active')">✕</button>
                        </div>

                        <div class="alert alert-info" style="margin-bottom: 16px;">
                            ℹ️ To verify ownership, describe the item with details only the true owner would know.
                        </div>

                        <div id="claim-alert"></div>

                        <form id="claim-form">
                            <input type="hidden" id="claim-item-id" value="">

                            <div class="form-group">
                                <label>📝 Ownership Proof Description *</label>
                                <textarea class="form-control" id="claim-description"
                                    placeholder="Describe details only the owner would know:&#10;- Serial number&#10;- Unique marks or scratches&#10;- What's inside (if bag/wallet)&#10;- Lock screen wallpaper (if phone)"
                                    required rows="5"></textarea>
                            </div>

                            <div class="form-group">
                                <label>📸 Upload Proof Image (optional)</label>
                                <div class="file-upload">
                                    <input type="file" id="claim-proof" accept="image/*">
                                    <div class="upload-icon">📷</div>
                                    <div class="upload-text">Upload photo proof</div>
                                    <div class="file-name" id="claim-file-name"></div>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary btn-block btn-lg" id="claim-btn">
                                📤 Submit Claim
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Setup claim form on matches page
        this.setupClaimForm(container);

        try {
            const data = await API.getItemMatches(itemId);
            const contentDiv = document.getElementById('matches-content');

            if (!data.matches || data.matches.length === 0) {
                contentDiv.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🤖</div>
                        <h3>No matches found yet</h3>
                        <p>Our AI couldn't find matching items right now. New items are checked automatically!</p>
                        <a href="#/items" class="btn btn-primary">Browse All Items</a>
                    </div>
                `;
                return;
            }

            contentDiv.innerHTML = `
                <div class="alert alert-success">
                    🤖 Found <strong>${data.total}</strong> possible match${data.total > 1 ? 'es' : ''}!
                    Click <strong>"🛡 Claim"</strong> if you recognize your item.
                </div>

                ${data.matches.map(match => {
                const scoreColor = Utils.getScoreColor(match.score.total_score);
                return `
                        <div class="match-card" style="padding: 20px;">
                            <div style="display: flex; gap: 16px; flex: 1; flex-wrap: wrap;">
                                ${match.image
                        ? `<img src="${API.getImageUrl(match.image)}" class="match-image"
                                        style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover;" alt="">`
                        : `<div class="match-image" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background: var(--light); border-radius: 8px; font-size: 2rem;">${Utils.getCategoryIcon(match.category)}</div>`
                    }

                                <div style="flex: 1; min-width: 200px;">
                                    <h4 style="margin-bottom: 6px; font-size: 1.1rem;">${Utils.escapeHtml(match.item_name)}</h4>
                                    <p style="margin: 4px 0; font-size: 0.85rem; color: var(--gray);">
                                        📂 ${Utils.escapeHtml(match.category)} • 📍 ${Utils.escapeHtml(match.location)}
                                    </p>
                                    <p style="margin: 4px 0; font-size: 0.85rem; color: var(--gray);">
                                        📅 ${Utils.formatDate(match.date_occurred)} • 👤 ${Utils.escapeHtml(match.username)}
                                    </p>
                                    <p style="font-size: 0.8rem; color: var(--gray); margin-top: 6px;">
                                        ${Utils.escapeHtml(match.description).substring(0, 150)}${match.description.length > 150 ? '...' : ''}
                                    </p>

                                    <!-- Score Breakdown -->
                                    <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; font-size: 0.75rem; color: var(--gray);">
                                        <span>📝 Text: <strong>${match.score.text_similarity}%</strong></span>
                                        <span>📂 Category: <strong>${match.score.category_match}%</strong></span>
                                        <span>📍 Location: <strong>${match.score.location_similarity}%</strong></span>
                                        <span>📅 Date: <strong>${match.score.date_proximity}%</strong></span>
                                    </div>

                                    <!-- Match Score Bar -->
                                    <div class="match-score" style="margin-top: 8px;">
                                        <span style="font-size: 0.8rem; color: var(--gray);">Match:</span>
                                        <div class="score-bar" style="width: 120px;">
                                            <div class="score-fill ${scoreColor}" style="width: ${match.score.total_score}%"></div>
                                        </div>
                                        <span class="score-text" style="font-size: 0.9rem; font-weight: 700;">${match.score.total_score}%</span>
                                    </div>
                                </div>
                            </div>

                            <!-- ACTION BUTTONS -->
                            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 130px; align-items: stretch;">
                                <span class="badge badge-${match.item_type}" style="text-align: center;">${match.item_type}</span>

                                <button class="btn btn-primary" onclick="ItemsModule.showClaimModal('${match.item_id}')">
                                    🛡 Claim Item
                                </button>

                                <a href="#/chat/${match.user_id}" class="btn btn-outline" style="text-align: center;">
                                    💬 Chat
                                </a>

                                <a href="#/item/${match.item_id}" class="btn btn-sm" style="background: var(--light); color: var(--dark); text-align: center;">
                                    👁 View Details
                                </a>
                            </div>
                        </div>
                    `;
            }).join('')}
            `;
        } catch (error) {
            document.getElementById('matches-content').innerHTML = `
                <div class="alert alert-error">❌ ${error.message}</div>
            `;
        }
    }

    /**
     * Setup claim form event listener
     */
    static setupClaimForm(container) {
        // Wait for DOM to be ready
        setTimeout(() => {
            const claimProofInput = document.getElementById('claim-proof');
            if (claimProofInput) {
                claimProofInput.addEventListener('change', function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        document.getElementById('claim-file-name').textContent = file.name;
                    }
                });
            }

            const claimForm = document.getElementById('claim-form');
            if (claimForm) {
                claimForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('claim-btn');
                    const alertDiv = document.getElementById('claim-alert');
                    const claimItemId = document.getElementById('claim-item-id').value;

                    if (!claimItemId) {
                        alertDiv.innerHTML = '<div class="alert alert-error">❌ No item selected</div>';
                        return;
                    }

                    btn.disabled = true;
                    btn.textContent = '⏳ Submitting...';

                    try {
                        const formData = new FormData();
                        formData.append('item_id', claimItemId);
                        formData.append('description', document.getElementById('claim-description').value);

                        const proofFile = document.getElementById('claim-proof').files[0];
                        if (proofFile) formData.append('proof_image', proofFile);

                        const result = await API.submitClaim(formData);
                        Toast.show('✅ ' + result.message, 'success');
                        document.getElementById('claim-modal').classList.remove('active');
                        alertDiv.innerHTML = '';

                        // Show success on page
                        const matchesContent = document.getElementById('matches-content');
                        if (matchesContent) {
                            const banner = document.createElement('div');
                            banner.className = 'alert alert-success';
                            banner.innerHTML = `✅ ${result.message} <a href="#/claims" style="margin-left: 10px;" class="btn btn-sm btn-primary">View Claims →</a>`;
                            matchesContent.prepend(banner);
                        }

                    } catch (error) {
                        alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '📤 Submit Claim';
                    }
                });
            }
        }, 100);
    }

    /**
     * Delete an item
     */
    static async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await API.deleteItem(itemId);
            Toast.show('Item deleted successfully', 'success');
            window.location.hash = '#/my-items';
        } catch (error) {
            Toast.show(error.message, 'error');
        }
    }
}

window.ItemsModule = ItemsModule;