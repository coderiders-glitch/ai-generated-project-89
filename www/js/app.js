class App {
    constructor() {
        this.api_base_url = 'http://localhost:3000';
        this.auth_token = null;
        this.current_user = null;
        this.current_screen = 'auth';
        
        this.auth = new Auth(this);
        this.chat = new Chat(this);
        this.assessment = new Assessment(this);
        
        this.init();
    }
    
    init() {
        document.addEventListener('deviceready', () => {
            this.onDeviceReady();
        });
        
        // For browser testing
        if (document.readyState === 'complete') {
            this.onDeviceReady();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                this.onDeviceReady();
            });
        }
    }
    
    onDeviceReady() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }
    
    setupEventListeners() {
        // Screen navigation
        document.getElementById('assessments-btn').addEventListener('click', () => {
            this.showScreen('assessment');
            this.assessment.loadAssessments();
        });
        
        document.getElementById('back-to-main').addEventListener('click', () => {
            this.showScreen('main');
        });
        
        document.getElementById('signout-btn').addEventListener('click', () => {
            this.auth.signOut();
        });
    }
    
    async checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.auth_token = token;
            try {
                const user = await this.apiCall('GET', '/auth/user');
                this.current_user = user;
                this.showScreen('main');
                this.chat.loadConversations();
            } catch (error) {
                localStorage.removeItem('auth_token');
                this.showScreen('auth');
            }
        } else {
            this.showScreen('auth');
        }
    }
    
    showScreen(screen_name) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        document.getElementById(`${screen_name}-screen`).classList.add('active');
        this.current_screen = screen_name;
    }
    
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }
    
    showError(message) {
        const toast = document.getElementById('error-toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    
    showSuccess(message) {
        const toast = document.getElementById('success-toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    
    async apiCall(method, path, data = null) {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (this.auth_token) {
            config.headers['Authorization'] = `Bearer ${this.auth_token}`;
        }
        
        if (data) {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${this.api_base_url}${path}`, config);
        
        if (!response.ok) {
            const error_data = await response.json().catch(() => ({ message: 'Network error' }));
            throw new Error(error_data.message || 'Request failed');
        }
        
        return await response.json();
    }
    
    setAuthToken(token) {
        this.auth_token = token;
        localStorage.setItem('auth_token', token);
    }
    
    clearAuthToken() {
        this.auth_token = null;
        localStorage.removeItem('auth_token');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});