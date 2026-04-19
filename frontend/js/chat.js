/**
 * 🌍 Lost & Found Smart Portal - Chat Module
 */

class ChatModule {
    static chatInterval = null;

    /**
     * Render Chat Page
     */
    static async renderChat(container, targetUserId) {
        // Clear any existing interval
        if (this.chatInterval) {
            clearInterval(this.chatInterval);
            this.chatInterval = null;
        }

        container.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>💬 Messages</h1>
                </div>

                <div class="chat-container" id="chat-container">
                    <div class="chat-sidebar">
                        <div class="chat-sidebar-header">💬 Conversations</div>
                        <div id="conversations-list">
                            <div class="loading" style="padding: 20px;"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <div class="chat-main" id="chat-main">
                        <div class="chat-header" id="chat-header">
                            <span>Select a conversation</span>
                        </div>
                        <div class="chat-messages" id="chat-messages">
                            <div class="empty-state">
                                <div class="empty-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the sidebar or start chatting from an item page</p>
                            </div>
                        </div>
                        <div class="chat-input" id="chat-input" style="display: none;">
                            <input type="text" id="message-input" placeholder="Type a message...">
                            <button onclick="ChatModule.sendMessage()">Send 📤</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load conversations
        await this.loadConversations();

        // If a target user is specified, open that conversation
        if (targetUserId) {
            this.openConversation(targetUserId);
        }
    }

    static async loadConversations() {
        const listDiv = document.getElementById('conversations-list');
        if (!listDiv) return;

        try {
            const data = await API.getAllConversations();

            if (!data.conversations || data.conversations.length === 0) {
                listDiv.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--gray); font-size: 0.85rem;">
                        No conversations yet.<br>Start from an item page!
                    </div>
                `;
                return;
            }

            listDiv.innerHTML = data.conversations.map(conv => `
                <div class="conversation-item" onclick="ChatModule.openConversation('${conv.partner_id}', '${Utils.escapeHtml(conv.partner_username)}')"
                    id="conv-${conv.partner_id}">
                    <div style="display: flex; justify-content: space-between;">
                        <span class="conv-name">👤 ${Utils.escapeHtml(conv.partner_username)}</span>
                        ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                    </div>
                    <div class="conv-preview">${Utils.escapeHtml(conv.last_message)}</div>
                    <div class="conv-time">${Utils.timeAgo(conv.last_time)}</div>
                </div>
            `).join('');
        } catch (error) {
            listDiv.innerHTML = `<div style="padding: 16px; color: var(--danger);">Error loading conversations</div>`;
        }
    }

    static currentChatUserId = null;

    static async openConversation(userId, username = '') {
        this.currentChatUserId = userId;

        // Highlight active conversation
        document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
        const convEl = document.getElementById(`conv-${userId}`);
        if (convEl) convEl.classList.add('active');

        // Update header
        const headerDiv = document.getElementById('chat-header');
        if (headerDiv) {
            headerDiv.innerHTML = `<span>💬 Chat with ${Utils.escapeHtml(username || 'User')}</span>`;
        }

        // Show input
        const inputDiv = document.getElementById('chat-input');
        if (inputDiv) inputDiv.style.display = 'flex';

        // Load messages
        await this.loadMessages(userId);

        // Enter key handler
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.onkeyup = (e) => {
                if (e.key === 'Enter') this.sendMessage();
            };
            messageInput.focus();
        }

        // Auto-refresh messages
        if (this.chatInterval) clearInterval(this.chatInterval);
        this.chatInterval = setInterval(() => {
            if (this.currentChatUserId === userId) {
                this.loadMessages(userId, true);
            }
        }, 5000);
    }

    static async loadMessages(userId, silent = false) {
        const messagesDiv = document.getElementById('chat-messages');
        if (!messagesDiv) return;

        if (!silent) {
            messagesDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }

        try {
            const data = await API.getConversation(userId);

            if (!data.messages || data.messages.length === 0) {
                messagesDiv.innerHTML = `
                    <div class="empty-state" style="padding: 20px;">
                        <div class="empty-icon">💬</div>
                        <p>No messages yet. Say hello!</p>
                    </div>
                `;
                return;
            }

            const previousScroll = messagesDiv.scrollTop;
            const wasAtBottom = messagesDiv.scrollHeight - messagesDiv.clientHeight <= messagesDiv.scrollTop + 50;

            messagesDiv.innerHTML = data.messages.map(msg => `
                <div class="message-bubble ${msg.is_mine ? 'sent' : 'received'}">
                    ${Utils.escapeHtml(msg.content)}
                    <div class="msg-time">${Utils.timeAgo(msg.created_at)}</div>
                </div>
            `).join('');

            // Auto-scroll to bottom only if was at bottom or fresh load
            if (wasAtBottom || !silent) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        } catch (error) {
            if (!silent) {
                messagesDiv.innerHTML = `<div style="padding: 16px; color: var(--danger);">Error loading messages</div>`;
            }
        }
    }

    static async sendMessage() {
        if (!this.currentChatUserId) return;

        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content) return;

        input.value = '';

        try {
            await API.sendMessage(this.currentChatUserId, content);
            await this.loadMessages(this.currentChatUserId, true);
        } catch (error) {
            Toast.show('Failed to send message', 'error');
            input.value = content;
        }
    }
}

window.ChatModule = ChatModule;