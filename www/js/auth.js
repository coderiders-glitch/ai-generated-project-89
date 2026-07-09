class Auth {
    constructor(app) {
        this.app = app;
        this.current_form = 'signin';
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Tab switching
        document.getElementById('signin-tab').addEventListener('click', () => {
            this.showForm('signin');
        });
        
        document.getElementById('signup-tab').addEventListener('click', () => {
            this.showForm('signup');
        });
        
        // Form submissions
        document.getElementById('signin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signIn();
        });
        
        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signUp();
        });
        
        document.getElementById('confirm-signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.confirmSignUp();
        });
        
        document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.forgotPassword();
        });
        
        document.getElementById('reset-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.confirmForgotPassword();
        });
        
        // Forgot password link
        document.getElementById('forgot-password-btn').addEventListener('click', () => {
            this.showForm('forgot-password');
        });
    }
    
    showForm(form_name) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Update tabs
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected form
        document.getElementById(`${form_name}-form`).classList.add('active');
        
        if (form_name === 'signin' || form_name === 'signup') {
            document.getElementById(`${form_name}-tab`).classList.add('active');
        }
        
        this.current_form = form_name;
    }
    
    async signIn() {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        
        if (!email || !password) {
            this.app.showError('Please fill in all fields');
            return;
        }
        
        try {
            this.app.showLoading();
            
            const response = await this.app.apiCall('POST', '/auth/signin', {
                email: email,
                password: password
            });
            
            this.app.setAuthToken(response.token);
            this.app.current_user = response.user;
            
            this.app.showScreen('main');
            this.app.chat.loadConversations();
            
        } catch (error) {
            this.app.showError(error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async signUp() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm_password = document.getElementById('signup-confirm-password').value;
        
        if (!email || !password || !confirm_password) {
            this.app.showError('Please fill in all fields');
            return;
        }
        
        if (password !== confirm_password) {
            this.app.showError('Passwords do not match');
            return;
        }
        
        try {
            this.app.showLoading();
            
            await this.app.apiCall('POST', '/auth/signup', {
                email: email,
                password: password
            });
            
            this.app.showSuccess('Please check your email for confirmation code');
            this.showForm('confirm-signup');
            
        } catch (error) {
            this.app.showError(error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async confirmSignUp() {
        const confirmation_code = document.getElementById('confirmation-code').value;
        const email = document.getElementById('signup-email').value;
        
        if (!confirmation_code) {
            this.app.showError('Please enter confirmation code');
            return;
        }
        
        try {
            this.app.showLoading();
            
            await this.app.apiCall('POST', '/auth/confirm-signup', {
                email: email,
                confirmation_code: confirmation_code
            });
            
            this.app.showSuccess('Account confirmed! Please sign in.');
            this.showForm('signin');
            
        } catch (error) {
            this.app.showError(error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async forgotPassword() {
        const email = document.getElementById('forgot-email').value;
        
        if (!email) {
            this.app.showError('Please enter your email');
            return;
        }
        
        try {
            this.app.showLoading();
            
            await this.app.apiCall('POST', '/auth/forgot-password', {
                email: email
            });
            
            this.app.showSuccess('Reset code sent to your email');
            this.showForm('reset-password');
            
        } catch (error) {
            this.app.showError(error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async confirmForgotPassword() {
        const email = document.getElementById('forgot-email').value;
        const reset_code = document.getElementById('reset-code').value;
        const new_password = document.getElementById('new-password').value;
        
        if (!reset_code || !new_password) {
            this.app.showError('Please fill in all fields');
            return;
        }
        
        try {
            this.app.showLoading();
            
            await this.app.apiCall('POST', '/auth/confirm-forgot-password', {
                email: email,
                confirmation_code: reset_code,
                new_password: new_password
            });
            
            this.app.showSuccess('Password reset successful! Please sign in.');
            this.showForm('signin');
            
        } catch (error) {
            this.app.showError(error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async signOut() {
        try {
            await this.app.apiCall('POST', '/auth/signout');
        } catch (error) {
            // Continue with logout even if API call fails
        }
        
        this.app.clearAuthToken();
        this.app.current_user = null;
        this.app.showScreen('auth');
        this.showForm('signin');
    }
}