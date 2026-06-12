const NavState = {
  openDropdown: null,

  managedSelector: '.nav-dropdown-panel, .nav-menu, .notif-overlay, .notification-dropdown, .nav-mobile',

  open(id) {
    if (!id) return;

    document.querySelectorAll(this.managedSelector).forEach((element) => {
      if (element.id !== id) {
        element.classList.remove('open');
        this.setTriggerExpanded(element.id, false);
      }
    });

    this.openDropdown = id;
    const element = document.getElementById(id);
    if (element) {
      element.classList.add('open');
      this.setTriggerExpanded(id, true);
    }
  },

  close(id) {
    if (!id) return;

    const element = document.getElementById(id);
    if (element) {
      element.classList.remove('open');
      this.setTriggerExpanded(id, false);
    }

    if (this.openDropdown === id) {
      this.openDropdown = null;
    }
  },

  closeAll() {
    document.querySelectorAll(this.managedSelector).forEach((element) => {
      element.classList.remove('open');
      this.setTriggerExpanded(element.id, false);
    });
    this.openDropdown = null;
  },

  toggle(id) {
    if (this.openDropdown === id) {
      this.closeAll();
    } else {
      this.open(id);
    }
  },

  setTriggerExpanded(id, expanded) {
    if (!id) return;
    document.querySelectorAll(`[data-dropdown-target="${CSS.escape(id)}"]`).forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(expanded));
    });
  },
};

let cachedNotificationCount = null;
let cachedMessageCount = null;

document.addEventListener('click', function () {
  NavState.closeAll();
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    NavState.closeAll();
  }
});

async function initNavbar() {
  const user = Auth.getUser();
  const initials = Auth.getInitials();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isAdmin = Auth.isAdmin();

  const studentNavbar = document.getElementById('navbar-student');
  const adminNavbar = document.getElementById('navbar-admin');
  if (studentNavbar && adminNavbar) {
    studentNavbar.classList.toggle('navbar-hidden', isAdmin);
    adminNavbar.classList.toggle('navbar-hidden', !isAdmin);
  }

  document.querySelectorAll('[data-admin-only]').forEach((element) => {
    element.classList.toggle('hidden', !isAdmin);
  });

  if (isAdmin) {
    document
      .querySelectorAll('.navbar--admin .nav-icon-btn[href$="messages.html"], .navbar--admin + .nav-mobile a[href$="messages.html"]')
      .forEach((element) => element.remove());
  }

  renderNavbarAvatar(user, initials);

  document.querySelectorAll('.nav-menu__name, #nav-menu-name').forEach((element) => {
    element.textContent = user?.name || '';
  });

  document.querySelectorAll('.nav-menu__email, #nav-menu-email').forEach((element) => {
    element.textContent = user?.email || '';
  });

  document.querySelectorAll('.nav-menu__id').forEach((element) => {
    element.textContent = user?.student_id || user?.role || element.textContent || '';
  });

  document.querySelectorAll('.navbar__logo').forEach((logo) => {
    if (!Auth.isLoggedIn()) {
      logo.setAttribute('href', 'index.html');
    } else {
      logo.setAttribute('href', isAdmin ? 'admin.html' : 'dashboard.html');
    }
  });

  document.querySelectorAll('.nav-link, .nav-mobile__link, .nav-menu__item').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const hrefPage = href.split('?')[0].split('/').pop();
    link.classList.toggle('active', hrefPage === currentPage);
  });

  document.querySelectorAll('.nav-avatar-wrap').forEach((wrap) => {
    const avatar = wrap.querySelector('.nav-avatar');
    const menu = wrap.querySelector('.nav-menu');
    if (!avatar || !menu || avatar.dataset.navReady) return;

    if (!menu.id) {
      menu.id = `nav-menu-${Math.random().toString(36).slice(2, 9)}`;
    }

    avatar.dataset.navReady = 'true';
    avatar.dataset.dropdownTarget = menu.id;
    avatar.addEventListener('click', (event) => {
      event.stopPropagation();
      NavState.toggle(menu.id);
    });

    if (!menu.dataset.panelReady) {
      menu.dataset.panelReady = 'true';
      menu.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
  });

  document.querySelectorAll('.nav-menu__item[href], .nav-mobile__link[href]').forEach((link) => {
    if (link.dataset.closeReady) return;
    link.dataset.closeReady = 'true';
    link.addEventListener('click', function() {
      NavState.closeAll();
      Utils.setButtonLoading(this, true, 'Loading...');
    });
  });

  document.querySelectorAll('.nav-hamburger').forEach((hamburger) => {
    const nav = hamburger.closest('.navbar');
    const siblingMobile = nav?.nextElementSibling?.classList?.contains('nav-mobile') ? nav.nextElementSibling : null;
    const mobileMenu = siblingMobile || document.getElementById('nav-mobile') || document.querySelector('.nav-mobile');
    if (!mobileMenu || hamburger.dataset.navReady) return;

    hamburger.dataset.navReady = 'true';
    hamburger.dataset.dropdownTarget = mobileMenu.id || 'nav-mobile';
    if (!mobileMenu.id) mobileMenu.id = hamburger.dataset.dropdownTarget;
    hamburger.addEventListener('click', (event) => {
      event.stopPropagation();
      NavState.toggle(mobileMenu.id);
    });

    if (!mobileMenu.dataset.panelReady) {
      mobileMenu.dataset.panelReady = 'true';
      mobileMenu.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
  });

  document.querySelectorAll('[data-logout]').forEach((button) => {
    if (button.dataset.logoutReady) return;

    button.dataset.logoutReady = 'true';
    button.addEventListener('click', async function(event) {
      event.preventDefault();
      NavState.closeAll();
      Utils.setButtonLoading(this, true, 'Signing out...');
      await Auth.logout();
    });
  });

  initNotificationBell();
  await refreshNotificationCount();
  if (!isAdmin) {
    await refreshMessageCount();
  }

  // Listen for custom event dispatched by page JS after any action that changes
  // notification state (e.g. mark-as-read, new notification created).
  document.addEventListener('notificationsUpdated', () => {
    refreshNotificationCount();
  });
}

function renderNavbarAvatar(user, initials) {
  const avatarUrl = user?.avatar_url || null;

  document.querySelectorAll('.nav-avatar, .nav-menu__avatar, #nav-menu-avatar').forEach((element) => {
    if (avatarUrl) {
      element.innerHTML = `<img class="nav-avatar-img" src="${escapeAttribute(avatarUrl)}" alt="Profile">`;
      return;
    }
    element.textContent = initials;
  });
}

function escapeAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function notificationIcon(type) {
  const icons = {
    claim_request: '🧾',
    found_report: '🎁',
    claim_accepted: '✅',
    claim_rejected: '⚠️',
    message: '💬',
    new_report: '📝',
    new_user: '👤',
    claim_submitted: '📌',
    system: '🔔',
  };

  return icons[type] || '🔔';
}

function notificationHref(notification) {
  if (notification.related_item_id) {
    return Auth.isAdmin()
      ? `admin-report-detail.html?id=${encodeURIComponent(notification.related_item_id)}`
      : `item-detail.html?id=${encodeURIComponent(notification.related_item_id)}`;
  }
  if (notification.related_conversation_id) {
    return `messages.html?id=${encodeURIComponent(notification.related_conversation_id)}`;
  }
  return '';
}

function relativeNotificationTime(value) {
  if (window.Utils?.relativeTime) return Utils.relativeTime(value);
  if (!value) return '';

  return new Date(value).toLocaleDateString();
}

function ensureNotificationDropdown(bell) {
  let panel = bell.parentElement?.querySelector('.notification-dropdown');
  const notifPageUrl = Auth.isAdmin()
    ? 'admin-notifications.html'
    : 'notifications.html';

  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'notification-dropdown notif-overlay';
    panel.id = `notif-overlay-${Math.random().toString(36).slice(2, 9)}`;
    panel.innerHTML = `
      <div class="notification-dropdown__header">
        <strong>Notifications</strong>
        <button type="button" class="notification-dropdown__mark">Mark all read</button>
      </div>
      <div class="notification-dropdown__list">
        <div class="notification-dropdown__empty">Loading notifications...</div>
      </div>
      <a class="notification-dropdown__footer" href="${notifPageUrl}">View all notifications</a>
    `;
    bell.parentElement?.appendChild(panel);
  }

  if (!panel.id) {
    panel.id = `notif-overlay-${Math.random().toString(36).slice(2, 9)}`;
  }

  bell.dataset.dropdownTarget = panel.id;
  panel.querySelector('.notification-dropdown__footer')?.setAttribute('href', notifPageUrl);
  return panel;
}

async function refreshNotificationCount() {
  if (!Auth.isLoggedIn() || !window.API?.notifications) return;

  try {
    const response = await API.notifications.list({ per_page: 1 });
    updateNotifBadge(Number(response?.meta?.unread_count || 0));
  } catch {
    updateNotifBadge(0);
  }
}

function updateNotifBadge(count) {
  cachedNotificationCount = Number(count || 0);

  document.querySelectorAll('.bell-badge, .notif-count').forEach((badge) => {
    if (cachedNotificationCount > 0) {
      badge.textContent = cachedNotificationCount > 99 ? '99+' : String(cachedNotificationCount);
      badge.classList.remove('hidden');
      badge.classList.toggle('dot--count', true);
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
      badge.classList.remove('dot--count');
    }
  });
}

async function refreshMessageCount() {
  if (!Auth.isLoggedIn() || !window.API?.messages?.unreadCount) return;

  try {
    const response = await API.messages.unreadCount();
    updateMessageBadge(Number(response?.count || 0));
  } catch {
    updateMessageBadge(0);
  }
}

function updateMessageBadge(count) {
  cachedMessageCount = Number(count || 0);

  document.querySelectorAll('.msg-badge, .msg-count').forEach((badge) => {
    if (cachedMessageCount > 0) {
      badge.textContent = cachedMessageCount > 99 ? '99+' : String(cachedMessageCount);
      badge.classList.remove('hidden');
      badge.classList.toggle('dot--count', true);
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
      badge.classList.remove('dot--count');
    }
  });
}

function renderNotificationList(panel, notifications) {
  const list = panel.querySelector('.notification-dropdown__list');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = '<div class="notification-dropdown__empty">No notifications yet.</div>';
    return;
  }

  list.innerHTML = notifications.map((notification) => `
    <button type="button" class="notification-item ${notification.is_read ? '' : 'notification-item--unread'}" data-notification-id="${Utils.escapeHtml(notification.id)}" data-href="${Utils.escapeHtml(notificationHref(notification))}">
      <span class="notification-item__icon notification-item__icon--${Utils.escapeHtml(notification.type || 'system')}">${notificationIcon(notification.type)}</span>
      <span class="notification-item__body">
        <span class="notification-item__title">${Utils.escapeHtml(notification.title || 'Notification')}</span>
        <span class="notification-item__message">${Utils.escapeHtml(notification.message || '')}</span>
        <span class="notification-item__time">${Utils.escapeHtml(relativeNotificationTime(notification.created_at))}</span>
      </span>
    </button>
  `).join('');
}

function notificationItems(response) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

async function loadNotificationDropdown(panel) {
  const list = panel.querySelector('.notification-dropdown__list');
  if (list) list.innerHTML = '<div class="notification-dropdown__empty">Loading notifications...</div>';

  try {
    const response = await API.notifications.list({ per_page: 5 });
    renderNotificationList(panel, notificationItems(response));
  } catch (error) {
    if (list) {
      list.innerHTML = `<div class="notification-dropdown__empty">${Utils.escapeHtml(error.message || 'Could not load notifications.')}</div>`;
    }
  }
}

function initNotificationBell() {
  document.querySelectorAll('.nav-icon-btn[href$="notifications.html"], .nav-icon-btn[href$="admin-notifications.html"]').forEach((bell) => {
    if (bell.dataset.notificationReady) return;

    bell.dataset.notificationReady = 'true';
    bell.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const panel = ensureNotificationDropdown(bell);
      NavState.toggle(panel.id);
      loadNotificationDropdown(panel);
    });

    const panel = ensureNotificationDropdown(bell);
    panel.addEventListener('click', async (event) => {
      event.stopPropagation();

      const markAll = event.target.closest('.notification-dropdown__mark');
      if (markAll) {
        const response = await API.notifications.markAllRead();
        updateNotifBadge(Number(response?.meta?.unread_count || 0));
        loadNotificationDropdown(panel);
        return;
      }

      const item = event.target.closest('.notification-item');
      if (!item) return;

      const href = item.dataset.href;
      NavState.closeAll();
      
      if (href) {
        await API.notifications.markRead(item.dataset.notificationId).catch(() => {});
        window.location.href = href;
      } else {
        API.notifications.markRead(item.dataset.notificationId).catch(() => {});
        if (item.classList.contains('notification-item--unread')) {
          item.classList.remove('notification-item--unread');
          updateNotifBadge(Math.max(0, (cachedNotificationCount || 0) - 1));
        }
      }
    });
  });
}

window.initNavbar = initNavbar;
window.renderNavbarAvatar = renderNavbarAvatar;
window.refreshNotificationCount = refreshNotificationCount;
window.refreshNotificationBadge = refreshNotificationCount;
window.updateNotifBadge = updateNotifBadge;
window.refreshMessageCount = refreshMessageCount;
window.refreshMessageBadge = refreshMessageCount;
window.updateMessageBadge = updateMessageBadge;
window.NavState = NavState;
