// SpiderDB — shared auth utilities

(function () {
  const API_URL = '';

  function getToken() {
    return localStorage.getItem('spiderdb_token');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('spiderdb_user'));
    } catch {
      return null;
    }
  }

  function setAuth(token, user) {
    localStorage.setItem('spiderdb_token', token);
    localStorage.setItem('spiderdb_user', JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem('spiderdb_token');
    localStorage.removeItem('spiderdb_user');
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }

  async function api(method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (getToken() || '')
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_URL + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Update nav for logged-in users
  function updateNav() {
    const navAuth = document.querySelector('.nav-auth');
    if (!navAuth) return;
    const user = getUser();
    if (user) {
      navAuth.innerHTML = `
        <span class="user-name">${escapeHtml(user.name)}</span>
        <a href="/dashboard.html" class="get-started">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Dashboard
        </a>
      `;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.SpiderDB = {
    getToken, getUser, setAuth, clearAuth, isLoggedIn, requireAuth,
    api, showToast, updateNav, escapeHtml
  };

  document.addEventListener('DOMContentLoaded', updateNav);
})();
