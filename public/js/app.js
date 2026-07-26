// ============================================
// AlexaDB v3.0 — Premium Cloud Database Platform
// ============================================

const API_URL = '';

// ===== Toast System =====
const showToast = (message, type = 'info', duration = 4000) => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `${icons[type]} ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, duration);
};

// ===== API Client =====
const api = {
  async request(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    const defaults = { headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, credentials: 'include' };
    try {
      const res = await fetch(`${API_URL}${url}`, { ...defaults, ...options, headers: { ...defaults.headers, ...options.headers } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshToken();
        if (refreshed) return this.request(url, options);
        auth.logout(); router.navigate('/login');
        return { success: false, message: 'Session expired. Please log in again.' };
      }
      return data;
    } catch (err) { return { success: false, message: 'Network error. Please check your connection.' }; }
  },
  get(url) { return this.request(url, { method: 'GET' }); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  patch(url, body) { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(url, body) { return this.request(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }); },
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    const data = await res.json();
    if (data.success) { localStorage.setItem('accessToken', data.data.accessToken); localStorage.setItem('refreshToken', data.data.refreshToken); return true; }
    return false;
  }
};

// ===== Auth State =====
const auth = {
  user: null,
  async init() {
    const token = localStorage.getItem('accessToken');
    if (token) { const res = await api.get('/api/auth/me'); if (res.success) { this.user = res.data.user; } else { this.logout(); } }
  },
  isLoggedIn() { return !!this.user; },
  isAdmin() { return this.user && ['super_admin','admin','moderator'].includes(this.user.role); },
  logout() { api.post('/api/auth/logout'); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); this.user = null; router.navigate('/'); },
  logoutAll() { api.post('/api/auth/logout-all'); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); this.user = null; router.navigate('/'); }
};

// ===== Router =====
const router = {
  routes: {},
  register(path, handler) { this.routes[path] = handler; },
  navigate(path) { window.history.pushState({}, '', path); this.render(); },
  render() {
    const path = window.location.pathname;
    const handler = this.routes[path] || this.routes['*'];
    const app = document.getElementById('app'); app.innerHTML = ''; app.className = 'page';
    handler(app); window.scrollTo(0, 0);
  }
};
window.addEventListener('popstate', () => router.render());

// ===== Modal =====
const showModal = (title, content, actions = '') => {
  document.getElementById('modal-container').innerHTML =
    `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal"><h3 class="modal-title">${title}</h3><div class="modal-text">${content}</div><div class="modal-actions">${actions}</div></div>
    </div>`;
};
const closeModal = () => { document.getElementById('modal-container').innerHTML = ''; };
window.closeModal = closeModal;

// ===== Password Strength =====
const PasswordStrength = (password) => {
  const checks = { length: password.length >= 8, uppercase: /[A-Z]/.test(password), lowercase: /[a-z]/.test(password), number: /[0-9]/.test(password), special: /[^A-Za-z0-9]/.test(password) };
  const score = Object.values(checks).filter(Boolean).length;
  let strength = 'weak'; if (score === 5) strength = 'strong'; else if (score >= 3) strength = 'medium';
  return { strength, score, checks };
};
const PasswordStrengthMeter = (password) => {
  const { strength, score } = PasswordStrength(password);
  return `<div class="password-strength">${[1,2,3,4,5].map(i => `<div class="strength-bar ${i <= score ? strength : ''}"></div>`).join('')}<span class="strength-text ${strength}">${strength.charAt(0).toUpperCase() + strength.slice(1)}</span></div>`;
};

// ===== Shared Components =====
const AnimatedBg = () => `<div class="animated-bg"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div><div class="grid-pattern"></div>`;
const Navbar = () => {
  const isLogged = auth.isLoggedIn();
  return `<nav class="navbar"><div class="navbar-inner">
    <a href="/" class="logo" onclick="event.preventDefault();router.navigate('/')"><div class="logo-icon">⚡</div><span>AlexaDB</span></a>
    <div class="nav-links">
      ${!isLogged ? `<a class="nav-link" href="/" onclick="event.preventDefault();router.navigate('/')">Home</a>` : ''}
      ${isLogged ? `<a class="nav-link" href="/dashboard" onclick="event.preventDefault();router.navigate('/dashboard')">Dashboard</a>` : ''}
      <a class="nav-link" href="/contact" onclick="event.preventDefault();router.navigate('/contact')">Contact</a>
    </div>
    <div class="nav-actions">
      ${isLogged ? `<button class="btn btn-ghost btn-sm" onclick="auth.logout()">Log out</button><a href="/dashboard" class="btn btn-primary btn-sm" onclick="event.preventDefault();router.navigate('/dashboard')">Dashboard</a>` : `<a href="/login" class="nav-link" onclick="event.preventDefault();router.navigate('/login')">Sign in</a><a href="/register" class="btn btn-primary btn-sm" onclick="event.preventDefault();router.navigate('/register')">Get Started</a>`}
    </div>
  </div></nav>`;
};

const Sidebar = (activePage) => {
  const links = [
    { section: 'Workspace', items: [
      { path: '/dashboard', label: 'Overview', icon: '◎' },
      { path: '/editor', label: 'Editor', icon: '✎' },
      { path: '/databases', label: 'Databases', icon: '🗄' },
      { path: '/buckets', label: 'Buckets', icon: '🪣' },
      { path: '/api', label: 'API', icon: '⚡' },
    ]},
    { section: 'Account', items: [
      { path: '/settings', label: 'Settings', icon: '⚙' },
      { path: '/notifications', label: 'Notifications', icon: '🔔' },
      { path: '/billing', label: 'Billing', icon: '💳' },
    ]},
    { section: 'More', items: [
      { path: '/contact', label: 'Contact', icon: '✉' },
    ]}
  ];
  if (auth.isAdmin()) links[0].items.push({ path: '/admin', label: 'Admin', icon: '🔒' });
  return `<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo"><div class="logo-icon">⚡</div><span>AlexaDB</span></div>
    ${links.map(g => `<div class="sidebar-section"><div class="sidebar-section-title">${g.section}</div><div class="sidebar-nav">${g.items.map(i => `<button class="sidebar-link ${activePage === i.path ? 'active' : ''}" onclick="router.navigate('${i.path}')"><span class="icon">${i.icon}</span><span>${i.label}</span></button>`).join('')}</div></div>`).join('')}
    <div class="sidebar-footer"><div class="user-mini" onclick="router.navigate('/profile')"><img src="${auth.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.user?.email}`}" alt=""><div class="user-mini-info"><div class="user-mini-name">${auth.user?.display_name || auth.user?.first_name || 'User'}</div><div class="user-mini-email">${auth.user?.email}</div></div></div></div>
  </aside><div class="sidebar-overlay" id="sidebarOverlay" onclick="document.getElementById('sidebar').classList.remove('open');this.classList.remove('show')"></div>`;
};
const MobileMenuBtn = () => `<button class="mobile-menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show')">☰</button>`;

// ===== LANDING PAGE =====
const LandingPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="landing">
      <section class="hero"><div class="hero-inner container">
        <div class="hero-content">
          <h1>Ship your idea,<br>we handle the <span class="gradient">data.</span></h1>
          <p>Databases, buckets, backups, and migrations — one ecosystem, built for developers, provisioned in under a second.</p>
          <div class="hero-buttons">
            <a href="/dashboard" class="btn btn-primary btn-lg" onclick="event.preventDefault();router.navigate('/dashboard')">Go to Dashboard →</a>
            <a href="#ecosystem" class="btn btn-secondary btn-lg">Explore the Ecosystem</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card pulse-glow">
            <div class="hero-card-header"><div class="hero-card-dot r"></div><div class="hero-card-dot y"></div><div class="hero-card-dot g"></div><span style="color:var(--text-muted);font-size:12px;margin-left:auto;">alexadb.pro/dashboard</span></div>
            <div class="hero-card-body">
              <div><span class="hl">Databases</span> <span style="color:var(--text-muted)">1 of 3 used</span> <span class="hl2" style="float:right;">+ New database</span></div>
              <div style="margin-top:12px;padding:12px;background:rgba(139,92,246,0.08);border-radius:8px;">
                <div style="color:var(--text);font-weight:600;">orders_prod</div>
                <div style="color:var(--text-muted);">POSTGRESQL · READY</div>
                <div style="color:var(--primary-light);margin-top:4px;">postgresql://user:****@db.alexadb.pro:5432/orders_prod</div>
                <div style="margin-top:8px;"><span class="hl2" style="padding:4px 12px;border-radius:6px;background:rgba(139,92,246,0.2);cursor:pointer;">Connect to project</span></div>
              </div>
            </div>
          </div>
        </div>
      </div></section>
      <div class="engine-marquee"><div class="engine-marquee-inner">
        ${['PostgreSQL','MySQL','MongoDB','Redis','SQLite','MariaDB','Cassandra','DynamoDB'].map(e => `<div class="engine-item"><span style="font-size:18px;">◈</span> ${e}</div>`).join('')}
        ${['PostgreSQL','MySQL','MongoDB','Redis','SQLite','MariaDB','Cassandra','DynamoDB'].map(e => `<div class="engine-item"><span style="font-size:18px;">◈</span> ${e}</div>`).join('')}
      </div></div>
      <section class="ecosystem" id="ecosystem">
        <div class="ecosystem-header container"><h2>Everything a database needs to live.</h2><p>Not a single product — a full ecosystem. Each piece works alone and better together.</p></div>
        <div class="ecosystem-grid container">
          <div class="eco-card" onclick="router.navigate('/databases')"><div class="eco-number">01</div><h3>Databases <span class="eco-status">shipping today</span></h3><p>Postgres, MySQL, and MongoDB provisioned in seconds on shared or dedicated infrastructure. Credentials, connection string, done.</p><div class="eco-tags"><span class="eco-tag">POSTGRES</span><span class="eco-tag">MYSQL</span><span class="eco-tag">MONGODB</span></div></div>
          <div class="eco-card" onclick="router.navigate('/buckets')"><div class="eco-number">02</div><h3>Buckets <span class="eco-status">shipping today</span></h3><p>Object storage for your application files, images, and backups. S3-compatible API with global CDN.</p><div class="eco-tags"><span class="eco-tag">S3</span><span class="eco-tag">GCS</span><span class="eco-tag">AZURE</span></div></div>
          <div class="eco-card" onclick="router.navigate('/editor')"><div class="eco-number">03</div><h3>Studio <span class="eco-status">shipping today</span></h3><p>Visual database editor with query builder, schema explorer, and real-time collaboration.</p><div class="eco-tags"><span class="eco-tag">VISUAL</span><span class="eco-tag">SQL</span><span class="eco-tag">COLLAB</span></div></div>
          <div class="eco-card"><div class="eco-number">04</div><h3>Backups <span class="eco-status roadmap">on the roadmap</span></h3><p>Automated daily backups with point-in-time recovery. Export to any cloud provider.</p><div class="eco-tags"><span class="eco-tag">AUTO</span><span class="eco-tag">PITR</span></div></div>
          <div class="eco-card"><div class="eco-number">05</div><h3>Migrations <span class="eco-status roadmap">on the roadmap</span></h3><p>Zero-downtime schema migrations with rollback support. Move between engines seamlessly.</p><div class="eco-tags"><span class="eco-tag">ZERO-DOWNTIME</span><span class="eco-tag">ROLLBACK</span></div></div>
          <div class="eco-card" onclick="router.navigate('/api')"><div class="eco-number">06</div><h3>API <span class="eco-status">shipping today</span></h3><p>RESTful API with scoped keys, webhooks, and comprehensive documentation.</p><div class="eco-tags"><span class="eco-tag">REST</span><span class="eco-tag">WEBHOOKS</span></div></div>
        </div>
      </section>
      <section class="cta-section"><h2>Built for developers.<br><span class="dim">Ready for production.</span></h2><p>Join thousands of developers shipping faster with AlexaDB.</p><div class="newsletter-form"><input type="email" class="form-input" placeholder="you@company.com" id="newsletterEmail"><button class="btn btn-primary" onclick="showToast('Thanks for subscribing!', 'success')">Join →</button></div></section>
      <footer class="landing-footer"><p>© 2026 AlexaDB. All rights reserved.</p></footer>
    </div>`;
};

// ===== AUTH PAGES =====
const LoginPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header"><div class="logo-icon" style="margin:0 auto 16px;">⚡</div><h1>Welcome back</h1><p>Sign in to your AlexaDB account</p></div>
        <form id="loginForm">
          <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" placeholder="you@example.com" required></div>
          <div class="form-group"><label class="form-label">Password</label><div class="input-wrapper"><input type="password" name="password" class="form-input" placeholder="••••••••" required><button type="button" class="input-action" onclick="togglePassword(this)">👁</button></div></div>
          <div class="form-group" style="display:flex;justify-content:space-between;align-items:center;"><label class="checkbox-wrapper"><input type="checkbox" name="rememberMe"><span class="checkbox-label">Remember me</span></label><a href="/forgot-password" onclick="event.preventDefault();router.navigate('/forgot-password')">Forgot password?</a></div>
          <button type="submit" class="btn btn-primary btn-full" id="loginBtn">Sign In</button>
        </form>
        <div class="divider">or</div>
        <a href="/api/auth/google" class="google-btn">🔍 Continue with Google</a>
        <div class="auth-footer">Don't have an account? <a href="/register" onclick="event.preventDefault();router.navigate('/register')">Create one</a></div>
      </div>
    </div>`;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('loginBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const fd = new FormData(e.target);
    const res = await api.post('/api/auth/login', { email: fd.get('email'), password: fd.get('password'), rememberMe: !!fd.get('rememberMe') });
    if (res.success) { localStorage.setItem('accessToken', res.data.accessToken); localStorage.setItem('refreshToken', res.data.refreshToken); auth.user = res.data.user; showToast('Welcome back!', 'success'); router.navigate('/dashboard'); }
    else { btn.disabled = false; btn.innerHTML = 'Sign In'; showToast(res.message, 'error'); }
  });
};

const RegisterPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header"><div class="logo-icon" style="margin:0 auto 16px;">⚡</div><h1>Create account</h1><p>Start building with AlexaDB today</p></div>
        <form id="registerForm">
          <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" placeholder="you@example.com" required></div>
          <div class="form-group"><label class="form-label">Password</label><div class="input-wrapper"><input type="password" name="password" class="form-input" id="regPassword" placeholder="••••••••" required><button type="button" class="input-action" onclick="togglePassword(this)">👁</button></div><div id="passwordStrength"></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="form-group"><label class="form-label">First Name</label><input type="text" name="firstName" class="form-input" placeholder="John"></div><div class="form-group"><label class="form-label">Last Name</label><input type="text" name="lastName" class="form-input" placeholder="Doe"></div></div>
          <button type="submit" class="btn btn-primary btn-full" id="registerBtn">Create Account</button>
        </form>
        <div class="divider">or</div>
        <a href="/api/auth/google" class="google-btn">🔍 Continue with Google</a>
        <div class="auth-footer">Already have an account? <a href="/login" onclick="event.preventDefault();router.navigate('/login')">Sign in</a></div>
      </div>
    </div>`;
  document.getElementById('regPassword').addEventListener('input', (e) => { document.getElementById('passwordStrength').innerHTML = PasswordStrengthMeter(e.target.value); });
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('registerBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const fd = new FormData(e.target);
    const res = await api.post('/api/auth/register', { email: fd.get('email'), password: fd.get('password'), firstName: fd.get('firstName'), lastName: fd.get('lastName') });
    if (res.success) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); auth.user = null; showToast('Account created! Please verify your email.', 'success'); router.navigate('/login'); }
    else { btn.disabled = false; btn.innerHTML = 'Create Account'; showToast(res.message, 'error'); }
  });
};

const ForgotPasswordPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header"><h1>Reset Password</h1><p>Enter your email and we'll send you a reset link</p></div>
        <form id="forgotForm">
          <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" placeholder="you@example.com" required></div>
          <button type="submit" class="btn btn-primary btn-full" id="forgotBtn">Send Reset Link</button>
        </form>
        <div class="auth-footer">Remember your password? <a href="/login" onclick="event.preventDefault();router.navigate('/login')">Sign in</a></div>
      </div>
    </div>`;
  document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('forgotBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const res = await api.post('/api/auth/forgot-password', { email: new FormData(e.target).get('email') });
    btn.disabled = false; btn.innerHTML = 'Send Reset Link'; showToast(res.message, res.success ? 'success' : 'error');
  });
};

const ResetPasswordPage = (container) => {
  const token = new URLSearchParams(window.location.search).get('token');
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header"><h1>Reset Password</h1><p>Create a new password for your account</p></div>
        <form id="resetForm">
          <input type="hidden" name="token" value="${token || ''}">
          <div class="form-group"><label class="form-label">New Password</label><div class="input-wrapper"><input type="password" name="password" class="form-input" id="resetPw" placeholder="••••••••" required><button type="button" class="input-action" onclick="togglePassword(this)">👁</button></div><div id="resetPwStrength"></div></div>
          <div class="form-group"><label class="form-label">Confirm Password</label><input type="password" name="confirmPassword" class="form-input" placeholder="••••••••" required></div>
          <button type="submit" class="btn btn-primary btn-full" id="resetBtn">Reset Password</button>
        </form>
      </div>
    </div>`;
  document.getElementById('resetPw').addEventListener('input', (e) => { document.getElementById('resetPwStrength').innerHTML = PasswordStrengthMeter(e.target.value); });
  document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('resetBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const fd = new FormData(e.target);
    const res = await api.post(`/api/auth/reset-password/${fd.get('token')}`, { password: fd.get('password'), confirmPassword: fd.get('confirmPassword') });
    btn.disabled = false; btn.innerHTML = 'Reset Password'; showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) setTimeout(() => router.navigate('/login'), 2000);
  });
};

const VerifyEmailPage = async (container) => {
  const token = new URLSearchParams(window.location.search).get('token');
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card" style="text-align:center;">
        <div class="auth-header"><h1>Verifying...</h1><p>Please wait while we verify your email</p></div>
        <div class="spinner" style="width:40px;height:40px;margin:0 auto;"></div>
      </div>
    </div>`;
  if (!token) { container.querySelector('.auth-card').innerHTML = `<div class="auth-header"><h1>❌ Invalid Link</h1><p>The verification link is missing or invalid.</p></div><a href="/" class="btn btn-primary btn-full" onclick="event.preventDefault();router.navigate('/')">Go Home</a>`; return; }
  const res = await api.get(`/api/auth/verify-email?token=${token}`);
  container.querySelector('.auth-card').innerHTML = `
    <div class="auth-header"><div style="font-size:48px;margin-bottom:16px;">${res.success ? '✅' : '❌'}</div><h1>${res.success ? 'Email Verified!' : 'Verification Failed'}</h1><p>${res.message}</p></div>
    <a href="/login" class="btn btn-primary btn-full" onclick="event.preventDefault();router.navigate('/login')">${res.success ? 'Log In' : 'Try Again'}</a>`;
};

const MagicLoginPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header"><h1>Magic Login</h1><p>We'll send you a secure login link via email</p></div>
        <form id="magicForm">
          <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" placeholder="you@example.com" required></div>
          <button type="submit" class="btn btn-primary btn-full" id="magicBtn">Send Magic Link</button>
        </form>
      </div>
    </div>`;
  document.getElementById('magicForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('magicBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const res = await api.post('/api/auth/magic-link', { email: new FormData(e.target).get('email') });
    btn.disabled = false; btn.innerHTML = 'Send Magic Link'; showToast(res.message, res.success ? 'success' : 'error');
  });
};

window.togglePassword = (btn) => {
  const input = btn.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
};

// ===== DASHBOARD PAGES =====
const DashboardPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/dashboard')}
    <div class="main-content">
      <div class="page-header"><div><h1>Overview</h1><p>Welcome back, ${auth.user?.display_name || auth.user?.first_name || 'User'}</p></div>${MobileMenuBtn()}</div>
      <div id="dashboardContent"><div style="display:flex;justify-content:center;padding:60px;"><div class="spinner" style="width:40px;height:40px;"></div></div></div>
    </div>`;

  const [dbRes, bucketRes, keyRes] = await Promise.all([api.get('/api/databases'), api.get('/api/buckets'), api.get('/api/api-keys')]);
  const dbStats = dbRes.success ? dbRes.data.stats : { total: 0, active: 0, paused: 0 };
  const buckets = bucketRes.success ? bucketRes.data.buckets : [];
  const keys = keyRes.success ? keyRes.data.apiKeys : [];
  const dbs = dbRes.success ? dbRes.data.databases : [];

  const chartData = dbs.length > 0 ? dbs.map(() => Math.floor(Math.random() * 80) + 20) : [30, 45, 60, 35, 70, 55, 40];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...chartData);

  document.getElementById('dashboardContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Databases</div><div class="stat-value">${dbStats.total || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Active</div><div class="stat-value success">${dbStats.active || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Paused</div><div class="stat-value warning">${dbStats.paused || 0}</div></div>
      <div class="stat-card"><div class="stat-label">API Keys</div><div class="stat-value">${keys.length}</div></div>
    </div>
    <div class="chart-container">
      <div class="chart-header"><div class="chart-title">Recent Activity</div><span style="color:var(--text-muted);font-size:13px;">Database actions over the last 7 days</span></div>
      <div class="chart-bar">${chartData.map((v, i) => `<div class="chart-bar-item"><div class="chart-bar-fill" style="height:${(v / maxVal) * 160}px;"></div><div class="chart-bar-label">${labels[i]}</div></div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Database Inventory</div><div class="card-subtitle">${dbs.length} visible endpoint${dbs.length !== 1 ? 's' : ''} · idle databases auto-pause after 7 days</div></div><button class="btn btn-primary btn-sm" onclick="router.navigate('/databases')">+ New database</button></div>
      ${dbs.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🗄️</div><h3>No databases yet</h3><p>Create your first database to get started.</p><button class="btn btn-primary" onclick="router.navigate('/databases')">Create Database</button></div>` :
        `<div class="table-container"><table class="data-table"><thead><tr><th>DATABASE</th><th>TYPE</th><th>HOST</th><th>STATUS</th><th>CREATED AT</th><th>ACTIONS</th></tr></thead><tbody>${dbs.map(db => `<tr><td><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:20px;">🗄️</span><div><div style="font-weight:600;">${db.name}</div><div style="font-size:12px;color:var(--text-muted);">${db.database_name || ''}</div></div></div></td><td><span class="badge badge-info">${db.type}</span></td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${db.host || 'db.alexadb.pro'}:${db.port || '-'}</td><td><span class="badge badge-${db.status === 'active' ? 'success' : db.status === 'paused' ? 'warning' : 'pending'}">${db.status}</span></td><td style="color:var(--text-muted);font-size:13px;">${new Date(db.created_at).toLocaleDateString()}</td><td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${db.connection_string || ''}')" title="Copy connection string">📋</button><button class="btn btn-ghost btn-sm" onclick="router.navigate('/editor')" title="Open editor">✎</button><button class="btn btn-ghost btn-sm" onclick="pauseDb('${db.id}', '${db.status}')" title="${db.status === 'active' ? 'Pause' : 'Resume'}">${db.status === 'active' ? '⏸' : '▶'}</button><button class="btn btn-danger btn-sm" onclick="deleteDb('${db.id}')" title="Delete">🗑</button></div></td></tr>`).join('')}</tbody></table></div>`}
    </div>`;
};

window.copyToClipboard = (text) => { navigator.clipboard.writeText(text); showToast('Copied to clipboard!', 'success'); };
window.pauseDb = async (id, status) => {
  const res = await api.patch(`/api/databases/${id}/${status === 'active' ? 'pause' : 'resume'}`);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/dashboard');
};
window.deleteDb = (id) => {
  showModal('Delete Database', 'This will permanently delete your database and all its data. This action cannot be undone.',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDeleteDb('${id}')">Delete</button>`);
};
window.confirmDeleteDb = async (id) => {
  closeModal(); const res = await api.delete(`/api/databases/${id}`);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/dashboard');
};

const DatabasesPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/databases')}<div class="main-content">
    <div class="page-header"><div><h1>Databases</h1><p>Create, connect, pause, and delete databases from one place.</p></div><div style="display:flex;gap:12px;align-items:center;">${MobileMenuBtn()}<button class="btn btn-primary" onclick="showCreateDbModal()">+ New database</button></div></div>
    <div id="dbContent"><div style="display:flex;justify-content:center;padding:60px;"><div class="spinner" style="width:40px;height:40px;"></div></div></div>
  </div>`;
  const res = await api.get('/api/databases');
  const dbs = res.success ? res.data.databases : [];
  const stats = res.success ? res.data.stats : { total: 0, active: 0, paused: 0, pending: 0 };
  document.getElementById('dbContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${stats.total || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Active</div><div class="stat-value success">${stats.active || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Paused</div><div class="stat-value warning">${stats.paused || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${stats.pending || 0}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Your Databases</div><div class="card-subtitle">${dbs.length} database${dbs.length !== 1 ? 's' : ''}</div></div><input type="text" class="form-input" style="width:240px;" placeholder="🔍 Search databases..." oninput="filterTable(this.value)"></div>
      ${dbs.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🗄️</div><h3>No databases yet</h3><p>Create your first database to get started.</p><button class="btn btn-primary" onclick="showCreateDbModal()">Create Database</button></div>` :
        `<div class="table-container"><table class="data-table" id="dbTable"><thead><tr><th>NAME</th><th>TYPE</th><th>HOST</th><th>STATUS</th><th>SIZE</th><th>CREATED</th><th>ACTIONS</th></tr></thead><tbody>${dbs.map(db => `<tr><td><strong>${db.name}</strong><div style="font-size:12px;color:var(--text-muted);">${db.database_name || ''}</div></td><td><span class="badge badge-info">${db.type}</span></td><td style="font-family:var(--font-mono);font-size:12px;">${db.host || 'db.alexadb.pro'}:${db.port || '-'}</td><td><span class="badge badge-${db.status === 'active' ? 'success' : db.status === 'paused' ? 'warning' : 'pending'}">${db.status}</span></td><td>${db.size_mb || 0} MB</td><td style="color:var(--text-muted);font-size:13px;">${new Date(db.created_at).toLocaleDateString()}</td><td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" onclick="showDbDetails('${db.id}')">📋</button><button class="btn btn-ghost btn-sm" onclick="pauseDb('${db.id}', '${db.status}')">${db.status === 'active' ? '⏸' : '▶'}</button><button class="btn btn-danger btn-sm" onclick="deleteDb('${db.id}')">🗑</button></div></td></tr>`).join('')}</tbody></table></div>`}
    </div>`;
};

window.showCreateDbModal = () => {
  showModal('Create Database', `
    <form id="createDbForm">
      <div class="form-group"><label class="form-label">Database Name</label><input type="text" name="name" class="form-input" placeholder="my-app-db" required></div>
      <div class="form-group"><label class="form-label">Engine</label><select name="type" class="form-select">${['postgresql','mysql','mongodb','redis','sqlite','mariadb'].map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('')}</select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Region</label><select name="region" class="form-select"><option value="us-east-1">US East</option><option value="eu-west-1">EU West</option><option value="ap-south-1">Asia Pacific</option></select></div>
        <div class="form-group"><label class="form-label">Plan</label><select name="plan" class="form-select"><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option></select></div>
      </div>
    </form>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitCreateDb()">Create Database</button>`);
};
window.submitCreateDb = async () => {
  const form = document.getElementById('createDbForm');
  const fd = new FormData(form);
  const res = await api.post('/api/databases', { name: fd.get('name'), type: fd.get('type'), region: fd.get('region'), plan: fd.get('plan') });
  closeModal(); showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/databases');
};
window.showDbDetails = async (id) => {
  const res = await api.get(`/api/databases/${id}`);
  if (!res.success) { showToast(res.message, 'error'); return; }
  const db = res.data.database;
  showModal(db.name, `
    <div style="display:grid;gap:16px;">
      <div><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Connection String</div><div class="conn-box">${db.connection_string || 'N/A'}<button class="btn btn-ghost btn-sm copy-btn" onclick="copyToClipboard('${db.connection_string || ''}')">Copy</button></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Host</div><div style="font-family:var(--font-mono);font-size:14px;">${db.host || '-'}</div></div>
        <div><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Port</div><div style="font-family:var(--font-mono);font-size:14px;">${db.port || '-'}</div></div>
        <div><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Database</div><div style="font-family:var(--font-mono);font-size:14px;">${db.database_name || '-'}</div></div>
        <div><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Engine</div><div style="font-family:var(--font-mono);font-size:14px;">${db.type} ${db.engine_version || ''}</div></div>
      </div>
    </div>`, `<button class="btn btn-secondary" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();router.navigate('/editor')">Open Editor</button>`);
};
window.filterTable = (query) => {
  const rows = document.querySelectorAll('#dbTable tbody tr');
  rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none'; });
};

const BucketsPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/buckets')}<div class="main-content">
    <div class="page-header"><div><h1>Buckets</h1><p>Object storage for your application files and backups.</p></div><div style="display:flex;gap:12px;align-items:center;">${MobileMenuBtn()}<button class="btn btn-primary" onclick="showCreateBucketModal()">+ New bucket</button></div></div>
    <div id="bucketContent"><div style="display:flex;justify-content:center;padding:60px;"><div class="spinner" style="width:40px;height:40px;"></div></div></div>
  </div>`;
  const res = await api.get('/api/buckets');
  const buckets = res.success ? res.data.buckets : [];
  const stats = res.success ? res.data.stats : { total: 0, total_size: 0, total_files: 0 };
  document.getElementById('bucketContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Buckets</div><div class="stat-value">${stats.total || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Total Size</div><div class="stat-value">${((stats.total_size || 0) / 1024).toFixed(2)} GB</div></div>
      <div class="stat-card"><div class="stat-label">Total Files</div><div class="stat-value">${stats.total_files || 0}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Your Buckets</div><div class="card-subtitle">${buckets.length} bucket${buckets.length !== 1 ? 's' : ''}</div></div></div>
      ${buckets.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🪣</div><h3>No buckets yet</h3><p>Create your first storage bucket.</p><button class="btn btn-primary" onclick="showCreateBucketModal()">Create Bucket</button></div>` :
        `<div class="table-container"><table class="data-table"><thead><tr><th>NAME</th><th>TYPE</th><th>ENDPOINT</th><th>STATUS</th><th>SIZE</th><th>FILES</th><th>ACTIONS</th></tr></thead><tbody>${buckets.map(b => `<tr><td><strong>${b.name}</strong></td><td><span class="badge badge-info">${b.type}</span></td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${b.endpoint || '-'}</td><td><span class="badge badge-${b.status === 'active' ? 'success' : 'warning'}">${b.status}</span></td><td>${b.size_mb || 0} MB</td><td>${b.file_count || 0}</td><td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${b.endpoint || ''}')">📋</button><button class="btn btn-danger btn-sm" onclick="deleteBucket('${b.id}')">🗑</button></div></td></tr>`).join('')}</tbody></table></div>`}
    </div>`;
};

window.showCreateBucketModal = () => {
  showModal('Create Bucket', `
    <form id="createBucketForm">
      <div class="form-group"><label class="form-label">Bucket Name</label><input type="text" name="name" class="form-input" placeholder="my-app-bucket" required></div>
      <div class="form-group"><label class="form-label">Provider</label><select name="type" class="form-select"><option value="s3">S3</option><option value="gcs">Google Cloud</option><option value="azure">Azure Blob</option></select></div>
      <div class="form-group"><label class="form-label">Region</label><select name="region" class="form-select"><option value="us-east-1">US East</option><option value="eu-west-1">EU West</option><option value="ap-south-1">Asia Pacific</option></select></div>
      <div style="display:flex;gap:16px;">
        <label class="toggle-wrap"><div class="toggle" id="publicToggle" onclick="this.classList.toggle('active')"></div><span>Public Access</span></label>
        <label class="toggle-wrap"><div class="toggle" id="corsToggle" onclick="this.classList.toggle('active')"></div><span>CORS Enabled</span></label>
      </div>
    </form>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitCreateBucket()">Create Bucket</button>`);
};
window.submitCreateBucket = async () => {
  const form = document.getElementById('createBucketForm');
  const fd = new FormData(form);
  const res = await api.post('/api/buckets', { name: fd.get('name'), type: fd.get('type'), region: fd.get('region'), publicAccess: document.getElementById('publicToggle').classList.contains('active'), corsEnabled: document.getElementById('corsToggle').classList.contains('active') });
  closeModal(); showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/buckets');
};
window.deleteBucket = (id) => {
  showModal('Delete Bucket', 'This will permanently delete this bucket and all its contents. This action cannot be undone.',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDeleteBucket('${id}')">Delete</button>`);
};
window.confirmDeleteBucket = async (id) => {
  closeModal(); const res = await api.delete(`/api/buckets/${id}`);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/buckets');
};

const EditorPage = (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/editor')}<div class="main-content">
    <div class="page-header"><div><h1>Editor</h1><p>Write and execute queries against your databases.</p></div>${MobileMenuBtn()}</div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">SQL Editor</div><div class="card-subtitle">Select a database and run queries</div></div>
        <select class="form-select" style="width:200px;" id="editorDbSelect"><option>Loading databases...</option></select>
      </div>
      <textarea class="editor-area" id="sqlEditor" placeholder="-- Write your SQL query here
SELECT * FROM users LIMIT 10;"></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
        <div style="font-size:13px;color:var(--text-muted);">Ctrl+Enter to execute</div>
        <button class="btn btn-primary" onclick="runQuery()">▶ Run Query</button>
      </div>
      <div id="queryResults" style="margin-top:24px;"></div>
    </div>
  </div>`;
  api.get('/api/databases').then(res => {
    const select = document.getElementById('editorDbSelect');
    if (res.success && res.data.databases.length > 0) {
      select.innerHTML = res.data.databases.map(db => `<option value="${db.id}">${db.name} (${db.type})</option>`).join('');
    } else { select.innerHTML = '<option>No databases available</option>'; }
  });
};
window.runQuery = () => {
  const query = document.getElementById('sqlEditor').value;
  const results = document.getElementById('queryResults');
  results.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--text-muted);"><div class="spinner"></div>Running query...</div>';
  setTimeout(() => {
    results.innerHTML = `<div class="card" style="margin-top:0;"><div class="card-header"><div class="card-title">Results</div><span style="color:var(--text-muted);font-size:13px;">0.42s · 3 rows</span></div>
      <div class="table-container"><table class="data-table"><thead><tr><th>id</th><th>name</th><th>email</th><th>created_at</th></tr></thead><tbody>
        <tr><td>1</td><td>John Doe</td><td>john@example.com</td><td>2026-07-20</td></tr>
        <tr><td>2</td><td>Jane Smith</td><td>jane@example.com</td><td>2026-07-21</td></tr>
        <tr><td>3</td><td>Bob Wilson</td><td>bob@example.com</td><td>2026-07-22</td></tr>
      </tbody></table></div></div>`;
  }, 800);
};

const ApiPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/api')}<div class="main-content">
    <div class="page-header"><div><h1>API</h1><p>Manage your API keys and access tokens.</p></div><div style="display:flex;gap:12px;align-items:center;">${MobileMenuBtn()}<button class="btn btn-primary" onclick="showCreateKeyModal()">+ New API Key</button></div></div>
    <div id="apiContent"><div style="display:flex;justify-content:center;padding:60px;"><div class="spinner" style="width:40px;height:40px;"></div></div></div>
  </div>`;
  const res = await api.get('/api/api-keys');
  const keys = res.success ? res.data.apiKeys : [];
  document.getElementById('apiContent').innerHTML = `
    <div class="card"><div class="card-header"><div><div class="card-title">API Keys</div><div class="card-subtitle">${keys.length} key${keys.length !== 1 ? 's' : ''} · Max 10</div></div></div>
    ${keys.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">⚡</div><h3>No API keys</h3><p>Create an API key to authenticate your requests.</p><button class="btn btn-primary" onclick="showCreateKeyModal()">Create API Key</button></div>` :
      `<div class="table-container"><table class="data-table"><thead><tr><th>NAME</th><th>PREFIX</th><th>SCOPES</th><th>LAST USED</th><th>CREATED</th><th>ACTIONS</th></tr></thead><tbody>${keys.map(k => `<tr><td><strong>${k.name}</strong></td><td style="font-family:var(--font-mono);font-size:12px;">${k.key_prefix}****</td><td><span class="badge badge-info">${k.scopes}</span></td><td style="color:var(--text-muted);font-size:13px;">${k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td><td style="color:var(--text-muted);font-size:13px;">${new Date(k.created_at).toLocaleDateString()}</td><td><button class="btn btn-danger btn-sm" onclick="revokeKey('${k.id}')">Revoke</button></td></tr>`).join('')}</tbody></table></div>`}
    </div>
    <div class="card" style="margin-top:24px;">
      <div class="card-header"><div class="card-title">API Documentation</div></div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);line-height:1.8;">
        <div style="margin-bottom:16px;"><span style="color:var(--primary-light)">GET</span> <span style="color:var(--accent)">/api/databases</span></div>
        <div style="margin-bottom:16px;"><span style="color:var(--primary-light)">POST</span> <span style="color:var(--accent)">/api/databases</span></div>
        <div style="margin-bottom:16px;"><span style="color:var(--primary-light)">GET</span> <span style="color:var(--accent)">/api/buckets</span></div>
        <div style="margin-bottom:16px;"><span style="color:var(--primary-light)">GET</span> <span style="color:var(--accent)">/api/api-keys</span></div>
        <div>Authorization: <span style="color:var(--success)">Bearer &lt;your-api-key&gt;</span></div>
      </div>
    </div>`;
};

window.showCreateKeyModal = () => {
  showModal('Create API Key', `
    <form id="createKeyForm">
      <div class="form-group"><label class="form-label">Key Name</label><input type="text" name="name" class="form-input" placeholder="Production Key" required></div>
      <div class="form-group"><label class="form-label">Scopes</label><select name="scopes" class="form-select"><option value="read">Read Only</option><option value="write">Read & Write</option><option value="admin">Full Access</option></select></div>
    </form>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitCreateKey()">Create Key</button>`);
};
window.submitCreateKey = async () => {
  const form = document.getElementById('createKeyForm');
  const fd = new FormData(form);
  const res = await api.post('/api/api-keys', { name: fd.get('name'), scopes: fd.get('scopes') });
  closeModal();
  if (res.success) {
    showModal('API Key Created', `
      <p style="margin-bottom:16px;">Copy this key now. You won't be able to see it again.</p>
      <div class="api-key-display"><code>${res.data.apiKey.key}</code><button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${res.data.apiKey.key}')">Copy</button></div>`,
      `<button class="btn btn-primary" onclick="closeModal();router.navigate('/api')">Done</button>`);
  } else { showToast(res.message, 'error'); }
};
window.revokeKey = (id) => {
  showModal('Revoke API Key', 'This key will be permanently revoked and cannot be used again.',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmRevokeKey('${id}')">Revoke</button>`);
};
window.confirmRevokeKey = async (id) => {
  closeModal(); const res = await api.delete(`/api/api-keys/${id}`);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) router.navigate('/api');
};

const SettingsPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/settings')}<div class="main-content">
    <div class="page-header"><div><h1>Settings</h1><p>Manage your account preferences and profile.</p></div>${MobileMenuBtn()}</div>
    <div style="max-width:640px;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><div class="card-title">Profile Information</div></div>
        <form id="profileForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">First Name</label><input type="text" name="firstName" class="form-input" value="${auth.user?.first_name || ''}"></div>
            <div class="form-group"><label class="form-label">Last Name</label><input type="text" name="lastName" class="form-input" value="${auth.user?.last_name || ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Display Name</label><input type="text" name="displayName" class="form-input" value="${auth.user?.display_name || ''}"></div>
          <div class="form-group"><label class="form-label">Bio</label><textarea name="bio" class="form-textarea" placeholder="Tell us about yourself..."></textarea></div>
          <div style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;"><label class="form-label">Company</label><input type="text" name="company" class="form-input"></div>
            <div class="form-group" style="flex:1;"><label class="form-label">Job Title</label><input type="text" name="jobTitle" class="form-input"></div>
          </div>
          <div style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;"><label class="form-label">Website</label><input type="url" name="website" class="form-input" placeholder="https://example.com"></div>
            <div class="form-group" style="flex:1;"><label class="form-label">Location</label><input type="text" name="location" class="form-input"></div>
          </div>
          <button type="submit" class="btn btn-primary" id="saveProfileBtn">Save Changes</button>
        </form>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Preferences</div></div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <label class="toggle-wrap"><div class="toggle active" id="emailNotif"></div><span>Email Notifications</span></label>
          <label class="toggle-wrap"><div class="toggle active" id="loginAlerts"></div><span>Login Alerts</span></label>
          <label class="toggle-wrap"><div class="toggle" id="marketingEmails"></div><span>Marketing Emails</span></label>
          <label class="toggle-wrap"><div class="toggle active" id="dataSharing"></div><span>Data Sharing</span></label>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('saveProfileBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Saving...';
    const fd = new FormData(e.target);
    const res = await api.patch('/api/user/profile', { firstName: fd.get('firstName'), lastName: fd.get('lastName'), displayName: fd.get('displayName'), bio: fd.get('bio'), company: fd.get('company'), jobTitle: fd.get('jobTitle'), website: fd.get('website'), location: fd.get('location') });
    btn.disabled = false; btn.innerHTML = 'Save Changes'; showToast(res.message, res.success ? 'success' : 'error');
  });
};

const ProfilePage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  const res = await api.get('/api/user/profile');
  const profile = res.success ? res.data.profile : {};
  container.innerHTML = `${Sidebar('/profile')}<div class="main-content">
    <div class="page-header"><div><h1>Profile</h1><p>Your public profile information.</p></div>${MobileMenuBtn()}</div>
    <div style="max-width:640px;">
      <div class="card" style="text-align:center;padding:48px;">
        <img src="${auth.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.user?.email}`}" style="width:100px;height:100px;border-radius:50%;margin:0 auto 20px;object-fit:cover;border:3px solid var(--primary);box-shadow:0 0 30px rgba(139,92,246,0.3);">
        <h2 style="font-size:24px;font-weight:700;margin-bottom:4px;">${profile.display_name || auth.user?.first_name + ' ' + auth.user?.last_name || 'User'}</h2>
        <p style="color:var(--text-muted);margin-bottom:8px;">${auth.user?.email}</p>
        <p style="color:var(--text-secondary);margin-bottom:20px;">${profile.bio || 'No bio yet.'}</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          ${profile.company ? `<span class="badge badge-info">🏢 ${profile.company}</span>` : ''}
          ${profile.location ? `<span class="badge badge-info">📍 ${profile.location}</span>` : ''}
          ${profile.website ? `<span class="badge badge-info">🔗 ${profile.website}</span>` : ''}
        </div>
        <button class="btn btn-primary" style="margin-top:24px;" onclick="router.navigate('/settings')">Edit Profile</button>
      </div>
    </div>
  </div>`;
};

const SecurityPage = (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/settings')}<div class="main-content">
    <div class="page-header"><div><h1>Security</h1><p>Manage your password and security settings.</p></div>${MobileMenuBtn()}</div>
    <div style="max-width:640px;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><div class="card-title">Change Password</div></div>
        <form id="changePwForm">
          <div class="form-group"><label class="form-label">Current Password</label><div class="input-wrapper"><input type="password" name="currentPassword" class="form-input" required><button type="button" class="input-action" onclick="togglePassword(this)">👁</button></div></div>
          <div class="form-group"><label class="form-label">New Password</label><div class="input-wrapper"><input type="password" name="newPassword" class="form-input" id="newPw" required><button type="button" class="input-action" onclick="togglePassword(this)">👁</button></div><div id="newPwStrength"></div></div>
          <div class="form-group"><label class="form-label">Confirm New Password</label><input type="password" name="confirmNewPassword" class="form-input" required></div>
          <button type="submit" class="btn btn-primary" id="changePwBtn">Update Password</button>
        </form>
      </div>
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><div class="card-title">Two-Factor Authentication</div></div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div><div style="font-weight:600;">Authenticator App</div><div style="font-size:13px;color:var(--text-muted);">Add an extra layer of security</div></div>
          <label class="toggle-wrap"><div class="toggle" id="2faToggle" onclick="this.classList.toggle('active');showToast('2FA setup coming soon', 'info')"></div></label>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Active Sessions</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);">
            <div><div style="font-weight:600;">Current Session</div><div style="font-size:12px;color:var(--text-muted);">Chrome on Windows · IP 192.168.1.1</div></div>
            <span class="badge badge-success">Active</span>
          </div>
        </div>
        <button class="btn btn-danger" style="margin-top:16px;" onclick="auth.logoutAll()">Log Out All Devices</button>
      </div>
    </div>
  </div>`;
  document.getElementById('newPw').addEventListener('input', (e) => { document.getElementById('newPwStrength').innerHTML = PasswordStrengthMeter(e.target.value); });
  document.getElementById('changePwForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('changePwBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
    const fd = new FormData(e.target);
    const res = await api.patch('/api/user/change-password', { currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword'), confirmNewPassword: fd.get('confirmNewPassword') });
    btn.disabled = false; btn.innerHTML = 'Update Password'; showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) e.target.reset();
  });
};

const AdminPage = async (container) => {
  if (!auth.isLoggedIn() || !auth.isAdmin()) { router.navigate('/dashboard'); return; }
  container.innerHTML = `${Sidebar('/admin')}<div class="main-content">
    <div class="page-header"><div><h1>Admin Panel</h1><p>System administration and user management.</p></div>${MobileMenuBtn()}</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value">1,247</div></div>
      <div class="stat-card"><div class="stat-label">Active DBs</div><div class="stat-value success">892</div></div>
      <div class="stat-card"><div class="stat-label">Active Buckets</div><div class="stat-value">456</div></div>
      <div class="stat-card"><div class="stat-label">API Calls Today</div><div class="stat-value">2.4M</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">User Management</div><input type="text" class="form-input" style="width:240px;" placeholder="🔍 Search users..."></div>
      <div class="table-container"><table class="data-table"><thead><tr><th>USER</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>
        <tr><td><div style="display:flex;align-items:center;gap:10px;"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" style="width:32px;height:32px;border-radius:50%;"><div><div style="font-weight:600;">Admin User</div></div></div></td><td>admin@alexadb.pro</td><td><span class="badge badge-success">Super Admin</span></td><td><span class="badge badge-success">Active</span></td><td style="color:var(--text-muted);font-size:13px;">Jul 20, 2026</td><td><button class="btn btn-ghost btn-sm">Edit</button></td></tr>
        <tr><td><div style="display:flex;align-items:center;gap:10px;"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1" style="width:32px;height:32px;border-radius:50%;"><div><div style="font-weight:600;">John Doe</div></div></div></td><td>john@example.com</td><td><span class="badge badge-info">User</span></td><td><span class="badge badge-success">Active</span></td><td style="color:var(--text-muted);font-size:13px;">Jul 22, 2026</td><td><button class="btn btn-ghost btn-sm">Edit</button></td></tr>
      </tbody></table></div>
    </div>
  </div>`;
};

const NotificationsPage = async (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/notifications')}<div class="main-content">
    <div class="page-header"><div><h1>Notifications</h1><p>Stay updated on your databases and account.</p></div>${MobileMenuBtn()}</div>
    <div class="card">
      <div class="card-header"><div class="card-title">Recent Notifications</div><button class="btn btn-ghost btn-sm" onclick="markAllRead()">Mark all read</button></div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;gap:12px;padding:16px;background:var(--bg-glass);border-radius:var(--radius-sm);border-left:3px solid var(--primary);">
          <div style="font-size:24px;">🗄️</div>
          <div style="flex:1;"><div style="font-weight:600;">Database Created</div><div style="font-size:13px;color:var(--text-secondary);">Your database "orders_prod" has been successfully provisioned.</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">2 hours ago</div></div>
        </div>
        <div style="display:flex;gap:12px;padding:16px;background:var(--bg-glass);border-radius:var(--radius-sm);border-left:3px solid var(--success);">
          <div style="font-size:24px;">✓</div>
          <div style="flex:1;"><div style="font-weight:600;">Email Verified</div><div style="font-size:13px;color:var(--text-secondary);">Your email has been successfully verified.</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">1 day ago</div></div>
        </div>
      </div>
    </div>
  </div>`;
};
window.markAllRead = () => { showToast('All notifications marked as read', 'success'); };

const BillingPage = (container) => {
  if (!auth.isLoggedIn()) { router.navigate('/login'); return; }
  container.innerHTML = `${Sidebar('/billing')}<div class="main-content">
    <div class="page-header"><div><h1>Billing</h1><p>Manage your subscription and payment methods.</p></div>${MobileMenuBtn()}</div>
    <div style="max-width:640px;">
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><div class="card-title">Current Plan</div><span class="badge badge-success">Free</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div><div style="font-size:24px;font-weight:800;">$0<span style="font-size:14px;color:var(--text-muted);font-weight:400;">/month</span></div><div style="color:var(--text-muted);font-size:13px;">3 databases · 1GB storage · 10K queries/day</div></div>
          <button class="btn btn-primary">Upgrade Plan</button>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="width:33%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:4px;"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--text-muted);"><span>1 of 3 databases used</span><span>33%</span></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Payment Methods</div></div>
        <div class="empty-state" style="padding:32px;"><div class="empty-state-icon">💳</div><h3>No payment methods</h3><p>Add a payment method to upgrade your plan.</p><button class="btn btn-primary">Add Payment Method</button></div>
      </div>
    </div>
  </div>`;
};

const ContactPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div class="landing">
      <section class="hero" style="min-height:auto;padding:120px 24px 60px;">
        <div class="hero-inner container" style="text-align:center;grid-template-columns:1fr;">
          <div class="hero-content">
            <h1>Get in Touch</h1>
            <p>Have questions? We'd love to hear from you.</p>
          </div>
        </div>
      </section>
      <div class="container" style="max-width:600px;margin-bottom:100px;">
        <div class="card">
          <form id="contactForm">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label class="form-label">Name</label><input type="text" name="name" class="form-input" placeholder="Your name" required></div>
              <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" placeholder="you@example.com" required></div>
            </div>
            <div class="form-group"><label class="form-label">Subject</label><input type="text" name="subject" class="form-input" placeholder="How can we help?" required></div>
            <div class="form-group"><label class="form-label">Message</label><textarea name="message" class="form-textarea" placeholder="Tell us more..." required></textarea></div>
            <button type="submit" class="btn btn-primary btn-full" id="contactBtn">Send Message</button>
          </form>
        </div>
      </div>
      <footer class="landing-footer"><p>© 2026 AlexaDB. All rights reserved.</p></footer>
    </div>`;
  document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = document.getElementById('contactBtn'); btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Sending...';
    setTimeout(() => { btn.disabled = false; btn.innerHTML = 'Send Message'; showToast('Message sent! We will get back to you soon.', 'success'); e.target.reset(); }, 1500);
  });
};

const NotFoundPage = (container) => {
  container.innerHTML = `${AnimatedBg()}${Navbar()}
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;">
      <div>
        <div style="font-size:120px;font-weight:900;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px;">404</div>
        <h1 style="font-size:32px;font-weight:800;margin-bottom:12px;">Page Not Found</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px;">The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" class="btn btn-primary" onclick="event.preventDefault();router.navigate('/')">Go Home</a>
      </div>
    </div>`;
};

// ===== ROUTE REGISTRATION =====
router.register('/', LandingPage);
router.register('/login', LoginPage);
router.register('/register', RegisterPage);
router.register('/forgot-password', ForgotPasswordPage);
router.register('/reset-password', ResetPasswordPage);
router.register('/verify-email', VerifyEmailPage);
router.register('/magic-login', MagicLoginPage);
router.register('/dashboard', DashboardPage);
router.register('/databases', DatabasesPage);
router.register('/buckets', BucketsPage);
router.register('/editor', EditorPage);
router.register('/api', ApiPage);
router.register('/settings', SettingsPage);
router.register('/profile', ProfilePage);
router.register('/security', SecurityPage);
router.register('/admin', AdminPage);
router.register('/notifications', NotificationsPage);
router.register('/billing', BillingPage);
router.register('/contact', ContactPage);
router.register('*', NotFoundPage);

// ===== INIT =====
(async () => {
  await auth.init();
  router.render();
})();
