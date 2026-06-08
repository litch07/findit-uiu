document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initNotificationsPage({
    filters: {
      all: () => true,
      approvals: (item) => ['approved', 'claim_accepted', 'claim_rejected'].includes(item.type),
      claim_requests: (item) => ['claim_request', 'found_report'].includes(item.type),
      system: (item) => ['system', 'message'].includes(item.type),
    },
  });
});

function notificationTarget(notification) {
  if (notification.related_item_id) {
    return `item-detail.html?id=${encodeURIComponent(notification.related_item_id)}`;
  }
  if (notification.related_conversation_id) {
    return `messages.html?id=${encodeURIComponent(notification.related_conversation_id)}`;
  }
  return '';
}

function notificationIcon(type) {
  const icons = {
    approved: 'OK',
    rejected: '!',
    claim_request: 'CR',
    found_report: 'FR',
    claim_accepted: 'OK',
    claim_rejected: '!',
    message: 'MSG',
    system: 'SYS',
  };
  return icons[type] || 'N';
}

function renderNotification(notification) {
  const unread = !notification.is_read;
  return `
    <article class="notif-card ${unread ? 'unread' : ''}" data-id="${Utils.escapeHtml(notification.id)}" data-href="${Utils.escapeHtml(notificationTarget(notification))}" data-type="${Utils.escapeHtml(notification.type || 'system')}">
      ${unread ? '<span class="unread-dot"></span>' : ''}
      <div class="notif-icon-lg">${Utils.escapeHtml(notificationIcon(notification.type))}</div>
      <div style="min-width:0;">
        <h3 class="m-0" style="font-size:16px;">${Utils.escapeHtml(notification.title || 'Notification')}</h3>
        <p class="text-sm text-muted" style="margin:6px 0 0;">${Utils.escapeHtml(notification.message || '')}</p>
        <div class="text-xs text-muted" style="margin-top:8px;">${Utils.escapeHtml(Utils.relativeTime(notification.created_at))}</div>
      </div>
    </article>
  `;
}

async function initNotificationsPage(config) {
  const list = document.getElementById('notif-list');
  const empty = document.getElementById('empty-notifs');
  const unreadBadge = document.getElementById('unread-badge');
  const tabs = Array.from(document.querySelectorAll('.filter-tab[data-filter]'));
  let notifications = [];
  let activeFilter = 'all';
  let currentPage = 1;
  let totalPages = 1;
  let unreadTotal = 0;

  function render() {
    const predicate = config.filters[activeFilter] || config.filters.all;
    const filtered = notifications.filter(predicate);
    if (unreadBadge) unreadBadge.textContent = unreadTotal ? `${unreadTotal} unread` : 'All read';
    if (list) list.innerHTML = filtered.map(renderNotification).join('');
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

  list?.addEventListener('click', (event) => {
    const card = event.target.closest('.notif-card');
    if (!card) return;

    API.notifications.markRead(card.dataset.id).catch(() => {});

    const href = card.dataset.href;
    if (href) {
      window.location.href = href;
    } else {
      card.classList.remove('unread');
      const dot = card.querySelector('.unread-dot');
      if (dot) dot.remove();

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
