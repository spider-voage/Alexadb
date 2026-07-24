// SpiderDB — Dashboard
// Plain JS. Manages databases, API keys, settings views.

(function () {
  if (!SpiderDB.requireAuth()) return;

  const content = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const userNameEl = document.getElementById('user-name');
  let currentView = 'databases';
  let databases = [];
  let apiKeys = [];

  // ---- init ----
  const user = SpiderDB.getUser();
  if (user) userNameEl.textContent = user.name;

  // ---- nav ----
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) switchView(view);
    });
  });

  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    SpiderDB.clearAuth();
    window.location.href = '/';
  });

  // ---- modals ----
  function openModal(id) {
    document.getElementById(id).classList.add('open');
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // ---- view switching ----
  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.sidebar-nav a[data-view="${view}"]`)?.classList.add('active');

    if (view === 'databases') renderDatabasesView();
    else if (view === 'apikeys') renderApiKeysView();
    else if (view === 'settings') renderSettingsView();
  }

  // ---- databases view ----
  async function renderDatabasesView() {
    pageTitle.textContent = 'Databases';
    content.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><span class="spinner"></span></div>';

    try {
      databases = await SpiderDB.api('GET', '/api/databases');
    } catch (err) {
      SpiderDB.showToast(err.message, 'error');
      databases = [];
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <p style="color:var(--text-muted);margin:0;">${databases.length} database${databases.length !== 1 ? 's' : ''}</p>
        <button class="btn btn-primary" id="open-create-db">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Database
        </button>
      </div>
    `;

    if (databases.length === 0) {
      html += `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path></svg>
          <h3>No databases yet</h3>
          <p>Create your first database to get started.</p>
          <button class="btn btn-primary" id="open-create-db-empty">Create Database</button>
        </div>
      `;
    } else {
      html += '<div class="db-grid">';
      databases.forEach(db => {
        html += `
          <div class="db-card" data-db-id="${db.id}">
            <div class="db-card-header">
              <h3>${SpiderDB.escapeHtml(db.name)}</h3>
              <span class="db-status ${db.status}">${db.status}</span>
            </div>
            <div class="db-card-meta">
              <span>${db.type.toUpperCase()}</span>
              <span>${db.subdomain || '—'}</span>
            </div>
            <div class="db-card-actions">
              <button class="btn btn-outline btn-sm view-db-btn" data-id="${db.id}">View</button>
              <button class="btn btn-outline btn-sm logs-db-btn" data-id="${db.id}">Logs</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    content.innerHTML = html;

    document.querySelectorAll('#open-create-db, #open-create-db-empty').forEach(btn => {
      btn?.addEventListener('click', () => openModal('create-db-modal'));
    });

    document.querySelectorAll('.view-db-btn').forEach(btn => {
      btn.addEventListener('click', () => openDbDetail(btn.dataset.id));
    });

    document.querySelectorAll('.logs-db-btn').forEach(btn => {
      btn.addEventListener('click', () => openDbLogs(btn.dataset.id));
    });
  }

  // ---- create database ----
  document.getElementById('create-db-submit').addEventListener('click', async () => {
    const name = document.getElementById('db-name').value.trim().toLowerCase();
    const type = document.getElementById('db-type').value;
    const errEl = document.getElementById('db-name-error');

    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      errEl.classList.add('visible');
      return;
    }
    errEl.classList.remove('visible');

    const btn = document.getElementById('create-db-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      await SpiderDB.api('POST', '/api/databases', { name, type });
      closeModal('create-db-modal');
      document.getElementById('create-db-form').reset();
      SpiderDB.showToast('Database created successfully', 'success');
      renderDatabasesView();
    } catch (err) {
      SpiderDB.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create';
    }
  });

  // ---- database detail ----
  async function openDbDetail(id) {
    const db = databases.find(d => d.id == id);
    if (!db) return;

    document.getElementById('detail-db-name').textContent = db.name;

    let html = `
      <div class="detail-section">
        <h3>Connection</h3>
        <div class="code-block">
          ${SpiderDB.escapeHtml(db.connection_string || '—')}
          <button class="copy-btn" data-copy="${SpiderDB.escapeHtml(db.connection_string || '')}">Copy</button>
        </div>
      </div>
      <div class="detail-section">
        <h3>Details</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
          <div class="stat-card">
            <p class="label">Type</p>
            <p class="value" style="font-size:1.25rem;">${db.type.toUpperCase()}</p>
          </div>
          <div class="stat-card">
            <p class="label">Status</p>
            <p class="value" style="font-size:1.25rem;"><span class="db-status ${db.status}">${db.status}</span></p>
          </div>
          <div class="stat-card">
            <p class="label">Subdomain</p>
            <p class="value" style="font-size:1.25rem;">${db.subdomain || '—'}</p>
          </div>
          <div class="stat-card">
            <p class="label">SSL</p>
            <p class="value" style="font-size:1.25rem;">Enabled</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('db-detail-body').innerHTML = html;

    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy);
        SpiderDB.showToast('Copied to clipboard', 'success');
      });
    });

    document.getElementById('delete-db-btn').onclick = async () => {
      if (!confirm('Delete this database? This cannot be undone.')) return;
      try {
        await SpiderDB.api('DELETE', '/api/databases/' + id);
        closeModal('db-detail-modal');
        SpiderDB.showToast('Database deleted', 'success');
        renderDatabasesView();
      } catch (err) {
        SpiderDB.showToast(err.message, 'error');
      }
    };

    openModal('db-detail-modal');
  }

  // ---- database logs ----
  async function openDbLogs(id) {
    const db = databases.find(d => d.id == id);
    if (!db) return;

    document.getElementById('detail-db-name').textContent = db.name + ' — Logs';

    try {
      const data = await SpiderDB.api('GET', '/api/databases/' + id + '/logs');
      let html = '<div class="detail-section"><h3>Recent Logs</h3><ul class="logs-list">';
      data.logs.forEach(log => {
        html += `
          <li>
            <span class="log-time">${log.timestamp}</span>
            <span class="log-level ${log.level}">${log.level}</span>
            <span class="log-message">${SpiderDB.escapeHtml(log.message)}</span>
          </li>
        `;
      });
      html += '</ul></div>';
      document.getElementById('db-detail-body').innerHTML = html;
      document.getElementById('delete-db-btn').style.display = 'none';
      openModal('db-detail-modal');
    } catch (err) {
      SpiderDB.showToast(err.message, 'error');
    }
  }

  // ---- API keys view ----
  async function renderApiKeysView() {
    pageTitle.textContent = 'API Keys';
    content.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><span class="spinner"></span></div>';

    try {
      apiKeys = await SpiderDB.api('GET', '/api/api-keys');
    } catch (err) {
      SpiderDB.showToast(err.message, 'error');
      apiKeys = [];
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <p style="color:var(--text-muted);margin:0;">${apiKeys.length} key${apiKeys.length !== 1 ? 's' : ''}</p>
        <button class="btn btn-primary" id="open-create-key">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New API Key
        </button>
      </div>
    `;

    if (apiKeys.length === 0) {
      html += `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
          <h3>No API keys yet</h3>
          <p>Create a key to access the SpiderDB API programmatically.</p>
          <button class="btn btn-primary" id="open-create-key-empty">Create API Key</button>
        </div>
      `;
    } else {
      html += '<div>';
      apiKeys.forEach(key => {
        html += `
          <div class="api-key-row">
            <div class="key-info">
              <h4>${SpiderDB.escapeHtml(key.name)}</h4>
              <span>Created ${new Date(key.created_at).toLocaleDateString()}${key.last_used ? ' · Last used ' + new Date(key.last_used).toLocaleDateString() : ''}</span>
            </div>
            <div class="key-actions">
              <button class="btn btn-danger btn-sm delete-key-btn" data-id="${key.id}">Revoke</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    content.innerHTML = html;

    document.querySelectorAll('#open-create-key, #open-create-key-empty').forEach(btn => {
      btn?.addEventListener('click', () => openModal('create-key-modal'));
    });

    document.querySelectorAll('.delete-key-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Revoke this API key?')) return;
        try {
          await SpiderDB.api('DELETE', '/api/api-keys/' + btn.dataset.id);
          SpiderDB.showToast('API key revoked', 'success');
          renderApiKeysView();
        } catch (err) {
          SpiderDB.showToast(err.message, 'error');
        }
      });
    });
  }

  // ---- create API key ----
  document.getElementById('create-key-submit').addEventListener('click', async () => {
    const name = document.getElementById('key-name').value.trim();
    if (!name) return;

    const btn = document.getElementById('create-key-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const data = await SpiderDB.api('POST', '/api/api-keys', { name });
      closeModal('create-key-modal');
      document.getElementById('create-key-form').reset();

      document.getElementById('revealed-key').textContent = data.key;
      openModal('reveal-key-modal');

      document.getElementById('copy-key-btn').onclick = () => {
        navigator.clipboard.writeText(data.key);
        SpiderDB.showToast('Copied to clipboard', 'success');
      };

      renderApiKeysView();
    } catch (err) {
      SpiderDB.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create';
    }
  });

  // ---- settings view ----
  function renderSettingsView() {
    pageTitle.textContent = 'Settings';
    const user = SpiderDB.getUser();

    content.innerHTML = `
      <div class="detail-view" style="max-width:32rem;">
        <div class="detail-section">
          <h3>Account</h3>
          <div class="form-group">
            <label>Name</label>
            <input type="text" value="${SpiderDB.escapeHtml(user?.name || '')}" disabled />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="text" value="${SpiderDB.escapeHtml(user?.email || '')}" disabled />
          </div>
        </div>
        <div class="detail-section">
          <h3>Danger Zone</h3>
          <p style="color:var(--text-muted);font-size:0.9375rem;margin:0 0 1rem;">Sign out of your account on this device.</p>
          <button class="btn btn-danger" id="settings-logout">Sign Out</button>
        </div>
      </div>
    `;

    document.getElementById('settings-logout').addEventListener('click', () => {
      SpiderDB.clearAuth();
      window.location.href = '/';
    });
  }

  // ---- initial render ----
  switchView('databases');
})();
