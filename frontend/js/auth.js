/**
 * 🌍 Lost & Found Smart Portal - Authentication Module
 */

class AuthModule {
    /**
     * Render Login Page
     */
    static renderLogin(container) {
        container.innerHTML = `
            <div class="container">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <div class="logo-icon">🌍</div>
                            <h2>Welcome Back</h2>
                            <p>Login to your Lost & Found account</p>
                        </div>

                        <div id="login-alert"></div>

                        <form id="login-form">
                            <div class="form-group">
                                <label>📧 Email</label>
                                <input type="email" class="form-control" id="login-email"
                                    placeholder="your@email.com" required>
                            </div>

                            <div class="form-group">
                                <label>🔒 Password</label>
                                <input type="password" class="form-control" id="login-password"
                                    placeholder="Enter your password" required>
                            </div>

                            <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
                                🔑 Login
                            </button>
                        </form>

                        <div class="auth-footer">
                            Don't have an account? <a href="#/signup">Sign up here</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const alertDiv = document.getElementById('login-alert');

            btn.disabled = true;
            btn.textContent = '⏳ Logging in...';
            alertDiv.innerHTML = '';

            try {
                const data = await API.login({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value,
                });

                Toast.show('Login successful! Welcome back! 🎉', 'success');
                window.location.hash = '#/dashboard';
                app.renderNavbar();
            } catch (error) {
                alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                btn.disabled = false;
                btn.textContent = '🔑 Login';
            }
        });
    }

    /**
     * Render Signup Page
     */
    static renderSignup(container) {
        container.innerHTML = `
            <div class="container">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <div class="logo-icon">🌍</div>
                            <h2>Create Account</h2>
                            <p>Join the Lost & Found community</p>
                        </div>

                        <div id="signup-alert"></div>

                        <form id="signup-form">
                            <div class="form-group">
                                <label>👤 Username</label>
                                <input type="text" class="form-control" id="signup-username"
                                    placeholder="Choose a username" required minlength="3">
                            </div>

                            <div class="form-group">
                                <label>📧 Email</label>
                                <input type="email" class="form-control" id="signup-email"
                                    placeholder="your@email.com" required>
                            </div>

                            <div class="form-group">
                                <label>👤 Full Name</label>
                                <input type="text" class="form-control" id="signup-fullname"
                                    placeholder="Your full name">
                            </div>

                            <div class="form-group">
                                <label>📞 Phone (optional)</label>
                                <input type="tel" class="form-control" id="signup-phone"
                                    placeholder="Phone number">
                            </div>

                            <div class="form-group">
                                <label>🔒 Password</label>
                                <input type="password" class="form-control" id="signup-password"
                                    placeholder="Min 6 characters" required minlength="6">
                            </div>

                            <div class="form-group">
                                <label>🔒 Confirm Password</label>
                                <input type="password" class="form-control" id="signup-confirm"
                                    placeholder="Confirm your password" required>
                            </div>

                            <button type="submit" class="btn btn-primary btn-block btn-lg" id="signup-btn">
                                ✨ Create Account
                            </button>
                        </form>

                        <div class="auth-footer">
                            Already have an account? <a href="#/login">Login here</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signup-btn');
            const alertDiv = document.getElementById('signup-alert');

            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;

            if (password !== confirm) {
                alertDiv.innerHTML = '<div class="alert alert-error">❌ Passwords do not match</div>';
                return;
            }

            btn.disabled = true;
            btn.textContent = '⏳ Creating account...';
            alertDiv.innerHTML = '';

            try {
                const data = await API.signup({
                    username: document.getElementById('signup-username').value,
                    email: document.getElementById('signup-email').value,
                    password: password,
                    full_name: document.getElementById('signup-fullname').value,
                    phone: document.getElementById('signup-phone').value,
                });

                Toast.show('Account created successfully! 🎉', 'success');
                window.location.hash = '#/dashboard';
                app.renderNavbar();
            } catch (error) {
                alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                btn.disabled = false;
                btn.textContent = '✨ Create Account';
            }
        });
    }

    /**
     * Render Profile Page
     */
    static async renderProfile(container) {
        container.innerHTML = `
            <div class="container">
                <div class="profile-container">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        try {
            const data = await API.getProfile();
            const user = data.user;

            container.innerHTML = `
                <div class="container">
                    <div class="profile-container">
                        <div class="card">
                            <div class="profile-header">
                                <div class="profile-avatar">${user.username[0].toUpperCase()}</div>
                                <h2>${Utils.escapeHtml(user.full_name || user.username)}</h2>
                                <p style="color: var(--gray);">@${Utils.escapeHtml(user.username)}</p>
                                ${user.role === 'admin' ? '<span class="badge badge-approved">ADMIN</span>' : ''}

                                <div class="profile-stats">
                                    <div class="stat">
                                        <div class="stat-num">${user.items_posted}</div>
                                        <div class="stat-label">Items Posted</div>
                                    </div>
                                    <div class="stat">
                                        <div class="stat-num">${user.successful_claims}</div>
                                        <div class="stat-label">Successful Claims</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card" style="margin-top: 20px;">
                            <h3>✏️ Edit Profile</h3>

                            <div id="profile-alert" style="margin-top: 16px;"></div>

                            <form id="profile-form" style="margin-top: 16px;">
                                <div class="form-group">
                                    <label>📧 Email</label>
                                    <input type="email" class="form-control" value="${Utils.escapeHtml(user.email)}" disabled>
                                </div>

                                <div class="form-group">
                                    <label>👤 Full Name</label>
                                    <input type="text" class="form-control" id="profile-fullname"
                                        value="${Utils.escapeHtml(user.full_name || '')}"
                                        placeholder="Your full name">
                                </div>

                                <div class="form-group">
                                    <label>📞 Phone</label>
                                    <input type="tel" class="form-control" id="profile-phone"
                                        value="${Utils.escapeHtml(user.phone || '')}"
                                        placeholder="Phone number">
                                </div>

                                <div class="form-group">
                                    <label>🔒 New Password (leave blank to keep current)</label>
                                    <input type="password" class="form-control" id="profile-password"
                                        placeholder="New password (min 6 chars)">
                                </div>

                                <button type="submit" class="btn btn-primary btn-block" id="profile-btn">
                                    💾 Save Changes
                                </button>
                            </form>
                        </div>

                        <div style="text-align: center; margin-top: 16px;">
                            <p style="color: var(--gray); font-size: 0.85rem;">
                                Member since ${Utils.formatDate(user.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('profile-btn');
                const alertDiv = document.getElementById('profile-alert');

                btn.disabled = true;
                btn.textContent = '⏳ Saving...';

                try {
                    const updateData = {
                        full_name: document.getElementById('profile-fullname').value,
                        phone: document.getElementById('profile-phone').value,
                    };

                    const newPassword = document.getElementById('profile-password').value;
                    if (newPassword) {
                        updateData.password = newPassword;
                    }

                    await API.updateProfile(updateData);
                    Toast.show('Profile updated successfully! ✅', 'success');

                    // Update local storage
                    const localUser = API.getUser();
                    if (localUser) {
                        localUser.full_name = updateData.full_name;
                        localUser.phone = updateData.phone;
                        localStorage.setItem('user', JSON.stringify(localUser));
                    }

                    alertDiv.innerHTML = '<div class="alert alert-success">✅ Profile updated!</div>';
                } catch (error) {
                    alertDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
                } finally {
                    btn.disabled = false;
                    btn.textContent = '💾 Save Changes';
                }
            });
        } catch (error) {
            container.innerHTML = `
                <div class="container">
                    <div class="alert alert-error">❌ Failed to load profile: ${error.message}</div>
                </div>
            `;
        }
    }
}

window.AuthModule = AuthModule;