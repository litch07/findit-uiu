const API_BASE = 'http://localhost:8000/api';

function getToken() {
  try {
    let raw = sessionStorage.getItem('findit_user');
    if (!raw) raw = localStorage.getItem('findit_user');
    return raw ? JSON.parse(raw)?.token || null : null;
  } catch {
    return null;
  }
}

function buildUrl(endpoint, data = null) {
  const url = new URL(`${API_BASE}${endpoint}`);

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  return url.toString();
}

async function apiCall(method, endpoint, data = null) {
  const upperMethod = method.toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const headers = {
    Accept: 'application/json',
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method: upperMethod,
    headers,
  };

  const url = upperMethod === 'GET' ? buildUrl(endpoint, data) : buildUrl(endpoint);

  if (upperMethod !== 'GET' && data !== null && data !== undefined) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Cannot connect to server. Please ensure the backend is running at localhost:8000.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (response.status === 401) {
    if (endpoint === '/auth/login') {
      throw new Error(payload?.message || 'Invalid email or password.');
    }
    sessionStorage.removeItem('findit_user');
    localStorage.removeItem('findit_user');
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'register.html', 'verification-result.html', '404.html'];
    if (!publicPages.includes(page)) {
      if (window.Toast && Toast.error) {
        Toast.error('Session ended. Please sign in again.');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      } else {
        alert('Session ended. Please sign in again.');
        window.location.href = 'login.html';
      }
    } else {
      // Only show toast if the user was actually logged in previously
      if (getToken() && window.Toast && Toast.error) {
        Toast.error('Session ended. Please sign in again.');
      }
    }
    throw new Error(payload?.message || 'Session ended. Please sign in again.');
  }

  if (response.status === 403 && payload?.message?.toLowerCase().includes('suspended')) {
    sessionStorage.clear();
    localStorage.clear();
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'register.html', 'verification-result.html', '404.html'];
    if (!publicPages.includes(page)) {
      window.location.href = 'login.html?reason=suspended';
    }
    throw new Error(payload?.message || 'Account suspended.');
  }

  if (!response.ok) {
    if (payload?.errors) {
      const fieldErrors = Object.values(payload.errors).flat().join('\n');
      throw Object.assign(new Error(fieldErrors || payload.message || 'Validation error'), { errors: payload.errors, fieldErrors });
    }
    throw new Error(payload?.message || `Request failed with status ${response.status}.`);
  }

  return payload ?? { success: true };
}

window.API = {
  apiCall,

  auth: {
    login: (email, password) => apiCall('POST', '/auth/login', { email, password }),
    register: (data) => apiCall('POST', '/auth/register', data),
    resendVerification: (email) => apiCall('POST', '/auth/resend-verification', { email }),
    logout: () => apiCall('POST', '/auth/logout'),
    me: () => apiCall('GET', '/auth/me'),
    updateProfile: (data) => apiCall('PATCH', '/auth/profile', data),
    updatePassword: (data) => apiCall('PATCH', '/auth/password', data),
    uploadPhoto: (formData) => apiCall('POST', '/auth/profile/photo', formData),
  },

  items: {
    list: (filters = {}) => apiCall('GET', '/items', filters),
    mine: (filters = {}) => apiCall('GET', '/my-items', filters),
    get: (id) => apiCall('GET', `/items/${id}`),
    create: (data) => apiCall('POST', '/items', data),
    update: (id, data) => apiCall('PATCH', `/items/${id}`, data),
    delete: (id, data = null) => apiCall('DELETE', `/items/${id}`, data),
  },

  stats: {
    public: () => apiCall('GET', '/stats'),
  },

  claims: {
    list: () => apiCall('GET', '/claims'),
    mine: () => apiCall('GET', '/my-claims'),
    get: (id) => apiCall('GET', `/claims/${id}`),
    create: (data) => apiCall('POST', '/claims', data),
    update: (id, data) => apiCall('PATCH', `/claims/${id}`, data),
    delete: (id) => apiCall('DELETE', `/claims/${id}`),
  },

  notifications: {
    list: (filters = {}) => apiCall('GET', '/notifications', filters),
    markRead: (id) => apiCall('PATCH', `/notifications/${id}`),
    markAllRead: () => apiCall('PATCH', '/notifications/read-all'),
  },

  messages: {
    unreadCount: () => apiCall('GET', '/messages/unread-count'),
    conversations: () => apiCall('GET', '/conversations'),
    start: (withId, itemId = null) => apiCall('POST', '/conversations', { with: withId, item_id: itemId }),
    getMessages: (id) => apiCall('GET', `/conversations/${id}`),
    send: (id, data) => apiCall('POST', `/conversations/${id}`, typeof data === 'string' ? { body: data } : data),
  },

  scamReports: {
    create: (data) => apiCall('POST', '/scam-reports', data),
  },

  misc: {
    contactAdmin: (data) => apiCall('POST', '/contact', data),
  },

  users: {
    get: (id) => apiCall('GET', `/users/${id}`),
  },

  admin: {
    stats: () => apiCall('GET', '/admin/stats'),
    pending: () => apiCall('GET', '/admin/pending'),
    users: (filters = {}) => apiCall('GET', '/admin/users', filters),
    items: (filters = {}) => apiCall('GET', '/admin/items', filters),
    item: (id) => apiCall('GET', `/admin/items/${id}`),
    updateItem: (id, data) => apiCall('PATCH', `/admin/items/${id}`, data),
    deleteItem: (id) => apiCall('DELETE', `/admin/items/${id}`),
    user: (id) => apiCall('GET', `/admin/users/${id}`),
    banUser: (id) => apiCall('PATCH', `/admin/users/${id}/ban`),
    unbanUser: (id) => apiCall('PATCH', `/admin/users/${id}/unban`),
    logs: (filters = {}) => apiCall('GET', '/admin/logs', filters),
    exportUsersUrl: (filters = {}) => buildUrl('/admin/export/users', { ...filters, token: getToken() }),
    exportLogsUrl: (filters = {}) => buildUrl('/admin/export/logs', { ...filters, token: getToken() }),
    exportItemsUrl: (filters = {}) => buildUrl('/admin/export/items', { ...filters, token: getToken() }),
  },
};
