class ContentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.content_items = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('create-content').addEventListener('click', () => {
            this.showContentModal();
        });

        document.getElementById('refresh-content').addEventListener('click', () => {
            this.loadContent();
        });

        document.getElementById('content-form').addEventListener('submit', (e) => {
            this.handleContentSubmit(e);
        });

        document.getElementById('cancel-content').addEventListener('click', () => {
            document.getElementById('content-modal').style.display = 'none';
        });
    }

    async loadContent() {
        try {
            const container = document.getElementById('content-list');
            container.innerHTML = '<div class="loading">Loading content...</div>';

            const response = await this.dashboard.apiCall('/api/content', 'GET');
            if (response.ok) {
                this.content_items = await response.json();
                this.renderContent();
            } else {
                throw new Error('Failed to load content');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            document.getElementById('content-list').innerHTML = '<div class="error">Error loading content</div>';
        }
    }

    renderContent() {
        const container = document.getElementById('content-list');
        
        if (!this.content_items || this.content_items.length === 0) {
            container.innerHTML = '<div class="empty">No content found</div>';
            return;
        }

        const html = this.content_items.map(content => {
            const created_date = content.created_at 
                ? new Date(content.created_at).toLocaleDateString()
                : 'Unknown';
            
            const content_preview = content.body 
                ? content.body.substring(0, 150) + '...'
                : 'No content';

            return `
                <div class="data-item content-item">
                    <div class="item-header">
                        <h4>${content.title || 'Untitled Content'}</h4>
                        <div class="item-actions">
                            <button class="btn btn-sm" onclick="contentManager.editContent('${content.id}')">Edit</button>
                            ${content.is_published 
                                ? `<button class="btn btn-sm btn-warning" onclick="contentManager.unpublishContent('${content.id}')">Unpublish</button>`
                                : `<button class="btn btn-sm btn-success" onclick="contentManager.publishContent('${content.id}')">Publish</button>`
                            }
                            <button class="btn btn-sm btn-danger" onclick="contentManager.deleteContent('${content.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="content-preview">
                        <p>${content_preview}</p>
                    </div>
                    <div class="item-meta">
                        <span>Status: ${content.is_published ? 'Published' : 'Draft'}</span>
                        <span>Created: ${created_date}</span>
                        <span>Type: ${content.content_type || 'Article'}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    showContentModal(content = null) {
        const modal = document.getElementById('content-modal');
        const title = document.getElementById('content-modal-title');
        const form = document.getElementById('content-form');
        
        if (content) {
            title.textContent = 'Edit Content';
            document.getElementById('content-id').value = content.id;
            document.getElementById('content-title').value = content.title || '';
            document.getElementById('content-body').value = content.body || '';
        } else {
            title.textContent = 'Create Content';
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    async handleContentSubmit(e) {
        e.preventDefault();
        
        const content_id = document.getElementById('content-id').value;
        const content_data = {
            title: document.getElementById('content-title').value,
            body: document.getElementById('content-body').value,
            content_type: 'article'
        };
        
        try {
            let response;
            if (content_id) {
                response = await this.dashboard.apiCall(`/api/content/${content_id}`, 'PUT', content_data);
            } else {
                response = await this.dashboard.apiCall('/api/content', 'POST', content_data);
            }
            
            if (response.ok) {
                document.getElementById('content-modal').style.display = 'none';
                await this.loadContent();
            } else {
                const error_data = await response.json();
                alert('Error saving content: ' + (error_data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving content:', error);
            alert('Error saving content: ' + error.message);
        }
    }

    async editContent(content_id) {
        try {
            const response = await this.dashboard.apiCall(`/api/content/${content_id}`, 'GET');
            if (response.ok) {
                const content = await response.json();
                this.showContentModal(content);
            }
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    async publishContent(content_id) {
        try {
            const response = await this.dashboard.apiCall(`/api/content/${content_id}/publish`, 'PUT');
            if (response.ok) {
                await this.loadContent();
            }
        } catch (error) {
            console.error('Error publishing content:', error);
        }
    }

    async unpublishContent(content_id) {
        try {
            const response = await this.dashboard.apiCall(`/api/content/${content_id}/unpublish`, 'PUT');
            if (response.ok) {
                await this.loadContent();
            }
        } catch (error) {
            console.error('Error unpublishing content:', error);
        }
    }

    async deleteContent(content_id) {
        if (confirm('Are you sure you want to delete this content?')) {
            try {
                const response = await this.dashboard.apiCall(`/api/content/${content_id}`, 'DELETE');
                if (response.ok) {
                    await this.loadContent();
                }
            } catch (error) {
                console.error('Error deleting content:', error);
            }
        }
    }
}

// Initialize content manager when dashboard is ready
window.contentManager = new ContentManager(dashboard);