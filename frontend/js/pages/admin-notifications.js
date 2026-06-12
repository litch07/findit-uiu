document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminNotificationsPage();
});

function adminNotificationTarget(notification) {
  if (notification.related_item_id) {
    return `admin-report-detail.html?id=${encodeURIComponent(notification.related_item_id)}`;
  }
  if (notification.related_conversation_id) {
    return `messages.html?id=${encodeURIComponent(notification.related_conversation_id)}`;
  }
  return '';
}

function adminNotificationIcon(type) {
  const icons = {
    new_report: '📝',
    claim_accepted: '✅',
    claim_submitted: '📌',
    claim_request: '🧾',
    item_resolved: '✨',
    system: '🔔',
    scam_report: '🚨',
  };
  return icons[type] || '🔔';
}

function renderAdminNotification(notification) {
  const unread = !notification.is_read;
  const icon = adminNotificationIcon(notification.type);
  const target = adminNotificationTarget(notification);
  return `
    <article class="notif-card ${unread ? 'unread' : ''}" data-id="${Utils.escapeHtml(notification.id)}" data-href="${Utils.escapeHtml(target)}" data-type="${Utils.escapeHtml(notification.type || 'system')}">
      ${unread ? '<div class="unread-dot-left"></div>' : '<div class="read-placeholder"></div>'}
      <div class="notif-icon-lg" style="font-size: 24px; display:flex; align-items:center; justify-content:center;">${Utils.escapeHtml(icon)}</div>
      <div style="min-width:0;">
        <p style="margin:0; font-size: 15px; color: var(--color-text-body);">${Utils.escapeHtml(notification.message || notification.title || 'Notification')}</p>
        <div class="text-xs text-muted" style="margin-top:4px;">${Utils.escapeHtml(Utils.relativeTime(notification.created_at))}</div>
      </div>
    </article>
  `;
}

function adminNotificationTarget(notification) {
  if (notification.related_item_id) {
    return `admin-report-detail.html?id=${encodeURIComponent(notification.related_item_id)}`;
  }
  if (notification.related_conversation_id) {
    return `messages.html?id=${encodeURIComponent(notification.related_conversation_id)}`;
  }
  return '';
}

async function initAdminNotificationsPage() {
  const list = document.getElementById('notif-list');
  const empty = document.getElementById('empty-notifs');
  const unreadBadge = document.getElementById('unread-badge');
  const tabs = Array.from(document.querySelectorAll('.filter-tab[data-filter]'));
  const filters = {
    all: () => true,
    pending: (item) => item.type === 'new_report',
    claims: (item) => ['claim_accepted', 'claim_submitted', 'claim_request'].includes(item.type),
    resolved: (item) => item.type === 'item_resolved',
  };
  let notifications = [];
  let activeFilter = 'all';
  let currentPage = 1;
  let totalPages = 1;
  let unreadTotal = 0;

  function render() {
    const filtered = notifications.filter(filters[activeFilter] || filters.all);
    if (unreadBadge) unreadBadge.textContent = unreadTotal ? `${unreadTotal} unread` : 'All read';
    if (list) list.innerHTML = filtered.map(renderAdminNotification).join('');
    empty?.classList.toggle('hidden', filtered.length > 0);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter || 'all';
      render();
    });
  });

  list?.addEventListener('click', async (event) => {
    const card = event.target.closest('.notif-card');
    if (!card) return;

    const href = card.dataset.href;
    if (href) {
      event.preventDefault();
      try {
        await API.notifications.markRead(card.dataset.id);
      } catch (e) {}
      window.location.href = href;
    } else {
      API.notifications.markRead(card.dataset.id).catch(() => {});
      card.classList.remove('unread');
      const dot = card.querySelector('.unread-dot-left');
      if (dot) {
        dot.className = 'read-placeholder';
      }

      const notification = notifications.find((item) => String(item.id) === String(card.dataset.id));
      if (notification && !notification.is_read) {
        notification.is_read = true;
        unreadTotal = Math.max(0, unreadTotal - 1);
        if (unreadBadge) unreadBadge.textContent = unreadTotal ? `${unreadTotal} unread` : 'All read';
        if (window.refreshNotificationCount) window.refreshNotificationCount();
      }
    }
  });

  document.getElementById('mark-all-read')?.addEventListener('click', async () => {
    try {
      await API.notifications.markAllRead();
      notifications = notifications.map((item) => ({ ...item, is_read: true }));
      unreadTotal = 0;
      render();
      if (window.refreshNotificationCount) {
        window.refreshNotificationCount();
      }
      Toast.success('Notifications marked as read.');
    } catch (error) {
      Toast.error(error.message);
    }
  });

  document.getElementById('notif-pagination')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    loadNotifications(Number(button.dataset.page || 1));
  });

  async function loadNotifications(page = 1) {
    if (list) list.innerHTML = '<div class="card" style="padding:24px;text-align:center;">Loading notifications...</div>';
    empty?.classList.add('hidden');

    try {
      const response = await API.notifications.list({ per_page: 12, page });
      const pager = normalizedPager(response);
      notifications = pager.items;
      currentPage = pager.currentPage;
      totalPages = pager.totalPages;
      unreadTotal = Number(response?.meta?.unread_count || 0);
      render();
      renderPagination(currentPage, totalPages);
    } catch (error) {
      Utils.showError(list, error.message);
      renderPagination(1, 1);
    }
  }

  loadNotifications(1);
}

function normalizedPager(response) {
  if (Array.isArray(response?.data?.data)) {
    return {
      items: response.data.data,
      currentPage: Number(response.data.current_page || 1),
      totalPages: Number(response.data.last_page || 1),
    };
  }

  const items = Array.isArray(response?.data) ? response.data : [];
  return {
    items,
    currentPage: 1,
    totalPages: 1,
  };
}

function renderPagination(current, total) {
  const paginationEl = document.getElementById('notif-pagination');
  if (!paginationEl) return;

  paginationEl.innerHTML = '';
  if (total <= 1) return;

  const pages = pageWindow(current, total);
  paginationEl.innerHTML = `
    <button class="pagination-btn" type="button" data-page="${Math.max(1, current - 1)}" ${current <= 1 ? 'disabled' : ''}>Previous</button>
    ${pages.map((page) => page === '...'
      ? '<span class="pagination-ellipsis">...</span>'
      : `<button class="pagination-btn ${page === current ? 'active' : ''}" type="button" data-page="${page}" ${page === current ? 'aria-current="page"' : ''}>${page}</button>`
    ).join('')}
    <button class="pagination-btn" type="button" data-page="${Math.min(total, current + 1)}" ${current >= total ? 'disabled' : ''}>Next</button>
  `;
}

function pageWindow(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('...');
    result.push(page);
  });
  return result;
}
