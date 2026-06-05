
document.documentElement.removeAttribute('data-theme');

const Auth = {
  getUser() {
    try {
      const raw = localStorage.getItem('findit_user');
      if (!raw) return null;

      const user = JSON.parse(raw);
      return user && typeof user === 'object' ? user : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    const { password, ...safeUser } = user || {};
    safeUser.loginTime = safeUser.loginTime || Date.now();
    localStorage.setItem('findit_user', JSON.stringify(safeUser));
  },

  clear() {
    localStorage.removeItem('findit_user');
  },

  isLoggedIn() {
    return Boolean(this.getUser()?.token);
  },

  isAdmin() {
    return this.getUser()?.role === 'admin';
  },

  getInitials() {
    const name = this.getUser()?.name || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';

    const first = parts[0][0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || '';
    return `${first}${second}`.toUpperCase();
  },

  async login(email, password) {
    try {
      const response = await API.auth.login(email, password);
      const user = {
        ...response.user,
        token: response.token,
      };

      this.setUser(user);
      return { success: true, user: this.getUser() };
    } catch (error) {
      if (window.Toast?.error) {
        Toast.error(error.message);
      }

      return { success: false, message: error.message };
    }
  },

  async logout() {
    try {
      await API.auth.logout();
    } catch {
      // Local logout still needs to complete if the token expired or the server is offline.
    } finally {
      this.clear();
      window.location.href = 'index.html';
    }
  },
};

function showBody() {
  document.body?.classList.add('ready');
}

function requireAuth() {
  showBody();

  const user = Auth.getUser();
  if (user && user.loginTime && (Date.now() - user.loginTime > 8 * 60 * 60 * 1000)) {
    Auth.clear();
    if (window.Toast && Toast.error) {
      Toast.error('Your session has expired. Please sign in again.');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
      alert('Your session has expired. Please sign in again.');
      window.location.href = 'login.html';
    }
    return false;
  }

  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function requireAdmin() {
  showBody();

  const user = Auth.getUser();
  if (user && user.loginTime && (Date.now() - user.loginTime > 8 * 60 * 60 * 1000)) {
    Auth.clear();
    if (window.Toast && Toast.error) {
      Toast.error('Your session has expired. Please sign in again.');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
      alert('Your session has expired. Please sign in again.');
      window.location.href = 'login.html';
    }
    return false;
  }

  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return false;
  }

  return true;
}

function requirePublic() {
  showBody();

  if (Auth.isLoggedIn()) {
    window.location.href = Auth.isAdmin() ? 'admin.html' : 'dashboard.html';
    return false;
  }

  return true;
}

window.Auth = Auth;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.requirePublic = requirePublic;

document.addEventListener('DOMContentLoaded', () => {
  const eyeBtns = document.querySelectorAll('.eye-btn');
  eyeBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.parentElement.querySelector('input');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
        } else {
          input.type = 'password';
        }
      }
    });
  });
});
