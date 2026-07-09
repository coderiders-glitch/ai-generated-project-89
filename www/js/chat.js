class Chat {
    constructor(app) {
        this.app = app;
        this.conversations = [];
        this.current_conversation = null;
        this.messages = [];
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            this.createNewConversation();
        });
        
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showChatList();
        });
        
        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('message-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        document.getElementById('archive-chat').addEventListener('click', () => {
            this.archiveConversation();
        });
        
        document.getElementById('delete-chat').addEventListener('click', () => {
            this.deleteConversation();
        });
    }
    
    async loadConversations() {
        try {
            this.app.showLoading();
            this.conversations = await this.app.apiCall('GET', '/api/chat');
            this.renderConversations();
        } catch (error) {
            this.app.showError('Failed to load conversations');
        } finally {
            this.app.hideLoading();
        }
    }
    
    renderConversations() {
        const container = document.getElementById('conversations');
        container.innerHTML = '';
        
        this.conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.innerHTML = `
                <div class="conversation-title">${conversation.title || 'New Conversation'}</div>
                <div class="conversation-preview">${conversation.last_message || 'No messages yet'}</div>
                <div class="conversation-time">${this.formatTime(conversation.updated_at)}</div>
            `;
            
            item.addEventListener('click', () => {
                this.openConversation(conversation);
            });
            
            container.appendChild(item);
        });
    }
    
    async createNewConversation() {
        try {
            this.app.showLoading();
            const conversation = await this.app.apiCall('POST', '/api/chat', {
                title: 'New Conversation'
            });
            
            this.conversations.unshift(conversation);
            this.renderConversations();
            this.openConversation(conversation);
        } catch (error) {
            this.app.showError('Failed to create conversation');
        } finally {
            this.app.hideLoading();
        }
    }
    
    async openConversation(conversation) {
        this.current_conversation = conversation;
        document.getElementById('chat-title').textContent = conversation.title || 'New Conversation';
        
        this.showChatInterface();
        await this.loadMessages(conversation.id);
    }
    
    async loadMessages(conversation_id) {
        try {
            this.app.showLoading();
            this.messages = await this.app.apiCall('GET', `/api/chat/${conversation_id}/messages`);
            this.renderMessages();
        } catch (error) {
            this.app.showError('Failed to load messages');
        } finally {
            this.app.hideLoading();
        }
    }
    
    renderMessages() {
        const container = document.getElementById('messages');
        container.innerHTML = '';
        
        this.messages.forEach(message => {
            const item = document.createElement('div');
            item.className = `message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`;
            item.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-time">${this.formatTime(message.created_at)}</div>
            `;
            
            container.appendChild(item);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    async sendMessage() {
        const input = document.getElementById('message-text');
        const content = input.value.trim();
        
        if (!content || !this.current_conversation) {
            return;
        }
        
        try {
            input.value = '';
            
            // Add user message to UI immediately
            const user_message = {
                content: content,
                sender: 'user',
                created_at: new Date().toISOString()
            };
            
            this.messages.push(user_message);
            this.renderMessages();
            
            // Send to API
            const response = await this.app.apiCall('POST', `/api/chat/${this.current_conversation.id}/messages`, {
                content: content
            });
            
            // Add bot response if provided
            if (response.bot_response) {
                const bot_message = {
                    content: response.bot_response,
                    sender: 'bot',
                    created_at: new Date().toISOString()
                };
                
                this.messages.push(bot_message);
                this.renderMessages();
            }
            
        } catch (error) {
            this.app.showError('Failed to send message');
            // Remove the optimistically added message
            this.messages.pop();
            this.renderMessages();
        }
    }
    
    async archiveConversation() {
        if (!this.current_conversation) return;
        
        try {
            await this.app.apiCall('PUT', `/api/chat/${this.current_conversation.id}/archive`);
            this.app.showSuccess('Conversation archived');
            this.showChatList();
            this.loadConversations();
        } catch (error) {
            this.app.showError('Failed to archive conversation');
        }
    }
    
    async deleteConversation() {
        if (!this.current_conversation) return;
        
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }
        
        try {
            await this.app.apiCall('DELETE', `/api/chat/${this.current_conversation.id}`);
            this.app.showSuccess('Conversation deleted');
            this.showChatList();
            this.loadConversations();
        } catch (error) {
            this.app.showError('Failed to delete conversation');
        }
    }
    
    showChatList() {
        document.getElementById('chat-list').style.display = 'block';
        document.getElementById('chat-interface').style.display = 'none';
        this.current_conversation = null;
    }
    
    showChatInterface() {
        document.getElementById('chat-list').style.display = 'none';
        document.getElementById('chat-interface').style.display = 'flex';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}