class AdminDashboard {
    constructor() {
        this.api_base_url = window.location.origin;
        this.auth_token = localStorage.getItem('auth_token');
        this.current_user = null;
        this.init();
    }

    async init() {
        if (!this.auth_token) {
            window.location.href = '/login.html';
            return;
        }

        await this.loadCurrentUser();
        this.setupEventListeners();
        this.loadDashboardStats();
    }

    async loadCurrentUser() {
        try {
            const response = await this.apiCall('/auth/user', 'GET');
            if (response.ok) {
                this.current_user = await response.json();
                document.getElementById('current-user').textContent = this.current_user.email || 'Admin';
            } else {
                throw new Error('Failed to load user');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.handleAuthError();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(e.target.dataset.section);
            });
        });

        // Sign out
        document.getElementById('signout-btn').addEventListener('click', () => {
            this.signOut();
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showSection(section_name) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active from nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const target_section = document.getElementById(`${section_name}-section`);
        if (target_section) {
            target_section.classList.add('active');
        }

        // Add active to nav link
        const active_link = document.querySelector(`[data-section="${section_name}"]`);
        if (active_link) {
            active_link.classList.add('active');
        }

        // Load section data
        this.loadSectionData(section_name);
    }

    async loadSectionData(section_name) {
        switch (section_name) {
            case 'dashboard':
                await this.loadDashboardStats();
                break;
            case 'conversations':
                if (window.conversationMonitor) {
                    await window.conversationMonitor.loadConversations();
                }
                break;
            case 'content':
                if (window.contentManager) {
                    await window.contentManager.loadContent();
                }
                break;
            case 'assessments':
                await this.loadAssessments();
                break;
        }
    }

    async loadDashboardStats() {
        try {
            // Load conversations count
            const conversations_response = await this.apiCall('/api/chat', 'GET');
            if (conversations_response.ok) {
                const conversations = await conversations_response.json();
                document.getElementById('active-conversations-count').textContent = conversations.length || 0;
            }

            // Load content count
            const content_response = await this.apiCall('/api/content', 'GET');
            if (content_response.ok) {
                const content = await content_response.json();
                document.getElementById('published-content-count').textContent = content.length || 0;
            }

            // Load assessments count
            const assessments_response = await this.apiCall('/api/assessments', 'GET');
            if (assessments_response.ok) {
                const assessments = await assessments_response.json();
                document.getElementById('active-assessments-count').textContent = assessments.length || 0;
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadAssessments() {
        try {
            const response = await this.apiCall('/api/assessments', 'GET');
            if (response.ok) {
                const assessments = await response.json();
                this.renderAssessments(assessments);
            } else {
                throw new Error('Failed to load assessments');
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
            document.getElementById('assessments-list').innerHTML = '<div class="error">Error loading assessments</div>';
        }
    }

    renderAssessments(assessments) {
        const container = document.getElementById('assessments-list');
        if (!assessments || assessments.length === 0) {
            container.innerHTML = '<div class="empty">No assessments found</div>';
            return;
        }

        const html = assessments.map(assessment => `
            <div class="data-item">
                <div class="item-header">
                    <h4>${assessment.title || 'Untitled Assessment'}</h4>
                    <div class="item-actions">
                        <button class="btn btn-sm" onclick="dashboard.editAssessment('${assessment.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.deleteAssessment('${assessment.id}')">Delete</button>
                    </div>
                </div>
                <p>${assessment.description || 'No description'}</p>
                <div class="item-meta">
                    <span>Status: ${assessment.is_active ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async apiCall(endpoint, method, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.auth_token}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.api_base_url}${endpoint}`, options);
        
        if (response.status === 401) {
            this.handleAuthError();
            return;
        }

        return response;
    }

    handleAuthError() {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
    }

    async signOut() {
        try {
            await this.apiCall('/auth/signout', 'POST');
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            localStorage.removeItem('auth_token');
            window.location.href = '/login.html';
        }
    }

    async editAssessment(assessment_id) {
        try {
            const response = await this.apiCall(`/api/assessments/${assessment_id}`, 'GET');
            if (response.ok) {
                const assessment = await response.json();
                this.showAssessmentModal(assessment);
            }
        } catch (error) {
            console.error('Error loading assessment:', error);
        }
    }

    showAssessmentModal(assessment = null) {
        const modal = document.getElementById('assessment-modal');
        const title = document.getElementById('assessment-modal-title');
        const form = document.getElementById('assessment-form');
        
        if (assessment) {
            title.textContent = 'Edit Assessment';
            document.getElementById('assessment-id').value = assessment.id;
            document.getElementById('assessment-title').value = assessment.title || '';
            document.getElementById('assessment-description').value = assessment.description || '';
        } else {
            title.textContent = 'Create Assessment';
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    async deleteAssessment(assessment_id) {
        if (confirm('Are you sure you want to delete this assessment?')) {
            try {
                const response = await this.apiCall(`/api/assessments/${assessment_id}`, 'DELETE');
                if (response.ok) {
                    await this.loadAssessments();
                }
            } catch (error) {
                console.error('Error deleting assessment:', error);
            }
        }
    }
}

// Initialize dashboard
const dashboard = new AdminDashboard();

// Setup assessment form
document.getElementById('assessment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const assessment_id = document.getElementById('assessment-id').value;
    const assessment_data = {
        title: document.getElementById('assessment-title').value,
        description: document.getElementById('assessment-description').value
    };
    
    try {
        let response;
        if (assessment_id) {
            response = await dashboard.apiCall(`/api/assessments/${assessment_id}`, 'PUT', assessment_data);
        } else {
            response = await dashboard.apiCall('/api/assessments', 'POST', assessment_data);
        }
        
        if (response.ok) {
            document.getElementById('assessment-modal').style.display = 'none';
            await dashboard.loadAssessments();
        }
    } catch (error) {
        console.error('Error saving assessment:', error);
    }
});

// Setup assessment controls
document.getElementById('create-assessment').addEventListener('click', () => {
    dashboard.showAssessmentModal();
});

document.getElementById('refresh-assessments').addEventListener('click', () => {
    dashboard.loadAssessments();
});

document.getElementById('cancel-assessment').addEventListener('click', () => {
    document.getElementById('assessment-modal').style.display = 'none';
});