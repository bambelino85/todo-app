/**
 * auth.js — Login / Register UI
 * Manages JWT token in localStorage.
 * Calls app.boot(token) once authenticated.
 */

const AUTH_API = 'https://task-manager-api-r427.onrender.com/api/auth';

const authUI = {
    token: localStorage.getItem('tm_token'),
    user:  JSON.parse(localStorage.getItem('tm_user') || 'null'),

    /* ─── Bootstrap ─── */
    async init() {
        if (this.token) {
            // Verify token is still valid against the server
            try {
                const res = await fetch(`${AUTH_API}/me`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.user  = data.user;
                    this.showApp();
                    return;
                }
            } catch (e) { /* network error — fall through to login */ }
            this.clearSession();
        }
        this.showAuth();
    },

    /* ─── Show / hide screens ─── */
    showAuth() {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('appRoot').style.display    = 'none';
    },

    showApp() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appRoot').style.display    = 'block';
        const greeting = document.getElementById('userGreeting');
        if (greeting && this.user) {
            greeting.textContent = `👋 ${this.user.name || this.user.email}`;
        }
        // Boot the task app with the stored token
        if (typeof app !== 'undefined') {
            app.boot(this.token);
        }
    },

    showLogin() {
        document.getElementById('loginForm').style.display    = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('authSubtitle').textContent   = 'Sign in to your account';
        document.getElementById('loginError').textContent     = '';
    },

    showRegister() {
        document.getElementById('loginForm').style.display    = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('authSubtitle').textContent   = 'Create a new account';
        document.getElementById('registerError').textContent  = '';
    },

    /* ─── Login ─── */
    async login() {
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl    = document.getElementById('loginError');
        const btn      = document.getElementById('loginBtn');

        errEl.textContent = '';
        if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

        btn.disabled    = true;
        btn.textContent = 'Signing in...';

        try {
            const res  = await fetch(`${AUTH_API}/login`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                errEl.textContent = data.error || 'Login failed.';
                return;
            }

            this.saveSession(data.token, data.user);
            document.getElementById('loginPassword').value = '';
            this.showApp();
        } catch (err) {
            errEl.textContent = 'Network error — please try again.';
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Log In';
        }
    },

    /* ─── Register ─── */
    async register() {
        const name     = document.getElementById('regName').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const errEl    = document.getElementById('registerError');
        const btn      = document.getElementById('registerBtn');

        errEl.textContent = '';
        if (!email || !password) { errEl.textContent = 'Email and password are required.'; return; }
        if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }

        btn.disabled    = true;
        btn.textContent = 'Creating account...';

        try {
            const res  = await fetch(`${AUTH_API}/register`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                errEl.textContent = data.error || 'Registration failed.';
                return;
            }

            this.saveSession(data.token, data.user);
            this.showApp();
        } catch (err) {
            errEl.textContent = 'Network error — please try again.';
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Create Account';
        }
    },

    /* ─── Logout ─── */
    logout() {
        this.clearSession();
        // Reset task app state
        if (typeof app !== 'undefined') {
            app.tasks = [];
            app.render();
        }
        document.getElementById('loginEmail').value    = '';
        document.getElementById('loginPassword').value = '';
        this.showLogin();
        this.showAuth();
    },

    /* ─── Session helpers ─── */
    saveSession(token, user) {
        this.token = token;
        this.user  = user;
        localStorage.setItem('tm_token', token);
        localStorage.setItem('tm_user',  JSON.stringify(user));
    },

    clearSession() {
        this.token = null;
        this.user  = null;
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_user');
    }
};

// Run on page load
document.addEventListener('DOMContentLoaded', () => authUI.init());
