/* ============================================
   RefConnect — api.js
   Core API utilities, toast, auth helpers
   ============================================ */

// ---------- API Wrapper ----------
const api = {
  async request(url, options = {}) {
    const defaults = {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = {
      ...defaults,
      ...options,
      headers: { ...defaults.headers, ...options.headers },
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);

      // Try to parse JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = (typeof data === 'object' && data.message) ? data.message : `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (!error.status) {
        // Network error
        error.message = 'Network error. Please check your connection.';
      }
      throw error;
    }
  },

  get(url) {
    return this.request(url, { method: 'GET' });
  },

  post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  },
};

// ---------- Toast Notifications ----------
(function initToastContainer() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createContainer);
  } else {
    createContainer();
  }

  function createContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }
})();

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <span class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300)">✕</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ---------- Auth Helpers ----------
async function checkAuth() {
  try {
    const res = await api.get('/api/auth/me');
    const user = res.data || res;
    // Normalize: ensure both user.userId and user.user_id exist
    if (user && user.userId && !user.user_id) user.user_id = user.userId;
    if (user && user.user_id && !user.userId) user.userId = user.user_id;
    return user;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/login.html';
      return null;
    }
    // For other errors, still redirect to login
    window.location.href = '/login.html';
    return null;
  }
}

async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch (e) {
    // Ignore errors on logout
  }
  window.location.href = '/login.html';
}

// ---------- Utility Functions ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getStatusBadgeClass(status) {
  const map = {
    pending: 'badge-pending',
    accepted: 'badge-accepted',
    rejected: 'badge-rejected',
    applied: 'badge-applied',
    referred: 'badge-referred',
    interview: 'badge-interview',
    selected: 'badge-selected',
  };
  return map[status?.toLowerCase()] || 'badge-info';
}

function getRoleBadgeClass(role) {
  return (role || '').toLowerCase();
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// ---------- Sidebar Toggle (Mobile) ----------
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

// Init sidebar on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}

// ---------- Tab Switching Helper ----------
function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector) || document;
  const tabBtns = container.querySelectorAll('.tab-btn');
  const tabContents = container.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(target);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

// ---------- Loading Skeleton Helpers ----------
function showSkeletons(container, count = 3, type = 'card') {
  let html = '';
  for (let i = 0; i < count; i++) {
    if (type === 'card') {
      html += `<div class="card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-sm"></div></div>`;
    } else if (type === 'stat') {
      html += `<div class="stat-card"><div class="skeleton skeleton-avatar"></div><div><div class="skeleton skeleton-title" style="width:60px;height:28px;"></div><div class="skeleton skeleton-text-sm" style="width:100px;"></div></div></div>`;
    }
  }
  if (typeof container === 'string') container = document.getElementById(container);
  if (container) container.innerHTML = html;
}

// Expose functions globally for other scripts
window.api = api;
window.checkAuth = checkAuth;
window.logout = logout;
window.showToast = showToast;
