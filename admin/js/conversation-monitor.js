class ConversationMonitor {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.conversations = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('refresh-conversations').addEventListener('click', () => {
            this.loadConversations();
        });
    }

    async loadConversations() {
        try {
            const container = document.getElementById('conversations-list');
            container.innerHTML = '<div class="loading">Loading conversations...</div>';

            const response = await this.dashboard.apiCall('/api/chat', 'GET');
            if (response.ok) {
                this.conversations = await response.json();
                await this.renderConversations();
            } else {
                throw new Error('Failed to load conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            document.getElementById('conversations-list').innerHTML = '<div class="error">Error loading conversations</div>';
        }
    }

    async renderConversations() {
        const container = document.getElementById('conversations-list');
        
        if (!this.conversations || this.conversations.length === 0) {
            container.innerHTML = '<div class="empty">No conversations found</div>';
            return;
        }

        // Load messages for each conversation to get more details
        const conversations_with_details = await Promise.all(
            this.conversations.map(async (conversation) => {
                try {
                    const messages_response = await this.dashboard.apiCall(`/api/chat/${conversation.id}/messages`, 'GET');
                    if (messages_response.ok) {
                        const messages = await messages_response.json();
                        return {
                            ...conversation,
                            message_count: messages.length,
                            last_message: messages[messages.length - 1] || null
                        };
                    }
                } catch (error) {
                    console.error(`Error loading messages for conversation ${conversation.id}:`, error);
                }
                return {
                    ...conversation,
                    message_count: 0,
                    last_message: null
                };
            })
        );

        const html = conversations_with_details.map(conversation => {
            const last_message_text = conversation.last_message 
                ? conversation.last_message.content.substring(0, 100) + '...'
                : 'No messages';
            
            const created_date = conversation.created_at 
                ? new Date(conversation.created_at).toLocaleDateString()
                : 'Unknown';

            return `
                <div class="data-item conversation-item">
                    <div class="item-header">
                        <h4>Conversation ${conversation.id}</h4>
                        <div class="item-actions">
                            <button class="btn btn-sm" onclick="conversationMonitor.viewConversation('${conversation.id}')">View</button>
                            <button class="btn btn-sm btn-warning" onclick="conversationMonitor.archiveConversation('${conversation.id}')">Archive</button>
                            <button class="btn btn-sm btn-danger" onclick="conversationMonitor.deleteConversation('${conversation.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="conversation-details">
                        <p class="last-message">${last_message_text}</p>
                        <div class="item-meta">
                            <span>Messages: ${conversation.message_count}</span>
                            <span>Created: ${created_date}</span>
                            <span>Status: ${conversation.is_archived ? 'Archived' : 'Active'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async viewConversation(conversation_id) {
        try {
            const response = await this.dashboard.apiCall(`/api/chat/${conversation_id}/messages`, 'GET');
            if (response.ok) {
                const messages = await response.json();
                this.showConversationModal(conversation_id, messages);
            }
        } catch (error) {
            console.error('Error loading conversation messages:', error);
        }
    }

    showConversationModal(conversation_id, messages) {
        // Create modal dynamically since it's not in the main HTML
        let modal = document.getElementById('conversation-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'conversation-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const messages_html = messages.map(message => {
            const timestamp = message.created_at 
                ? new Date(message.created_at).toLocaleString()
                : 'Unknown time';
            
            return `
                <div class="message-item ${message.role}">
                    <div class="message-header">
                        <strong>${message.role}</strong>
                        <span class="timestamp">${timestamp}</span>
                    </div>
                    <div class="message-content">${message.content}</div>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Conversation ${conversation_id}</h3>
                <div class="messages-container">
                    ${messages_html || '<div class="empty">No messages in this conversation</div>'}
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('conversation-modal').style.display='none'">Close</button>
                </div>
            </div>
        `;

        // Add close event listener
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.style.display = 'block';
    }

    async archiveConversation(conversation_id) {
        if (confirm('Are you sure you want to archive this conversation?')) {
            try {
                const response = await this.dashboard.apiCall(`/api/chat/${conversation_id}/archive`, 'PUT');
                if (response.ok) {
                    await this.loadConversations();
                }
            } catch (error) {
                console.error('Error archiving conversation:', error);
            }
        }
    }

    async deleteConversation(conversation_id) {
        if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            try {
                const response = await this.dashboard.apiCall(`/api/chat/${conversation_id}`, 'DELETE');
                if (response.ok) {
                    await this.loadConversations();
                }
            } catch (error) {
                console.error('Error deleting conversation:', error);
            }
        }
    }
}

// Initialize conversation monitor when dashboard is ready
window.conversationMonitor = new ConversationMonitor(dashboard);