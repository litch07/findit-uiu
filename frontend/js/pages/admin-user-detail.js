/* frontend/js/pages/admin-user-detail.js */
document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminUserDetail();
  initTabs();
});

let userData = null;

function initTabs() {
  const tabs = document.querySelectorAll('#user-detail-tabs .admin-filter-pill');
  const panes = document.querySelectorAll('.tab-pane');

  function switchTab(tabId) {
    tabs.forEach(t => t.classList.remove('active'));
    panes.forEach(p => p.classList.add('hidden'));

    const activeTab = document.querySelector(`.admin-filter-pill[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeTab && activePane) {
      activeTab.classList.add('active');
      activePane.classList.remove('hidden');
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabId = e.target.dataset.tab;
      switchTab(tabId);
      window.location.hash = tabId.replace('tab-', '');
    });
  });

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchTab(`tab-${hash}`);
  }
}

async function initAdminUserDetail() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');

  if (!userId) {
    Toast.error('No user ID provided.');
    return;
  }

  const elements = {
    avatar: document.getElementById('ud-avatar'),
    name: document.getElementById('ud-name'),
    studentId: document.getElementById('ud-student-id'),
    email: document.getElementById('ud-email'),
    statusBadge: document.getElementById('ud-status-badge'),
    verifiedBadge: document.getElementById('ud-verified-badge'),
    joined: document.getElementById('ud-joined'),
    breadcrumbName: document.getElementById('breadcrumb-user-name'),

    statTotal: document.getElementById('ud-stat-total'),
    statActive: document.getElementById('ud-stat-active'),
    statResolved: document.getElementById('ud-stat-resolved'),
    statClaims: document.getElementById('ud-stat-claims'),
    banActionContainer: document.getElementById('ud-ban-action-container')
  };

  try {
    const response = await window.API.admin.user(userId);
    userData = response.data;

    elements.breadcrumbName.textContent = userData.name || 'Unknown User';

    // Avatar
    const nameParts = (userData.name || '').trim().split(/\s+/);
    const initials = nameParts.length > 1
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0]?.[0] || '👤').toUpperCase();

    if (userData.avatar_url) {
      elements.avatar.innerHTML = `<img src="${Utils.escapeHtml(userData.avatar_url)}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      elements.avatar.textContent = initials;
    }

    const breadcrumbAvatar = document.getElementById('breadcrumb-avatar');
    if (breadcrumbAvatar) {
      if (userData.avatar_url) {
        breadcrumbAvatar.innerHTML = `<img src="${Utils.escapeHtml(userData.avatar_url)}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        breadcrumbAvatar.textContent = initials;
      }
    }

    // Profile
    elements.name.textContent = userData.name || 'Unknown User';
    elements.studentId.textContent = userData.student_id || '-';
    elements.email.textContent = userData.email || '-';

    // Badges
    const isBanned = userData.is_banned === true;
    elements.statusBadge.innerHTML = isBanned
      ? '<span class="badge badge-danger">Suspended</span>'
      : '<span class="badge badge-success">Active</span>';

    elements.verifiedBadge.innerHTML = userData.email_verified_at
      ? '<span class="badge badge-success">Verified</span>'
      : '<span class="badge badge-danger">Unverified</span>';

    elements.joined.textContent = Utils.formatDate(userData.created_at);

    // Action button
    if (elements.banActionContainer && userData.role !== 'admin') {
      elements.banActionContainer.classList.remove('hidden');
      elements.banActionContainer.innerHTML = isBanned
        ? `<button class="btn btn-success btn-full" id="btn-unban">Reinstate Account</button>`
        : `<button class="btn btn-danger btn-full" id="btn-ban">Suspend Account</button>`;

      const btnBan = document.getElementById('btn-ban');
      const btnUnban = document.getElementById('btn-unban');

      if (btnBan) {
        btnBan.addEventListener('click', () => handleBanToggle(userId, userData.name, 'ban'));
      }
      if (btnUnban) {
        btnUnban.addEventListener('click', () => handleBanToggle(userId, userData.name, 'unban'));
      }
    } else if (elements.banActionContainer) {
      elements.banActionContainer.classList.add('hidden');
    }

    // Stats calculation
    const items = userData.items || [];
    const claims = userData.claims || [];

    const activeItems = items.filter(i => i.status === 'active').length;
    const resolvedItems = items.filter(i => i.status === 'resolved').length;

    elements.statTotal.textContent = items.length;
    elements.statActive.textContent = activeItems;
    elements.statResolved.textContent = resolvedItems;
    elements.statClaims.textContent = claims.length;

    // Export button for user activity
    const btnExportUserLogs = document.getElementById('btn-export-user-logs');
    if (btnExportUserLogs) {
      btnExportUserLogs.addEventListener('click', () => {
        window.location.href = API.admin.exportLogsUrl({
          target_type: 'user',
          target_id: userId
        });
      });
    }

    // Render Tabs Data
    renderPosts();
    renderActivityLogs();
    renderClaims();

    // Bind posts filter
    const postFilter = document.getElementById('filter-posts-status');
    if (postFilter) {
      postFilter.addEventListener('change', () => {
        renderPosts(postFilter.value);
      });
    }

  } catch (error) {
    console.error(error);
    Toast.error(error.message || 'Failed to load user details.');
  }
}

function renderPosts(statusFilter = '') {
  const tbody = document.getElementById('user-posts-tbody');
  const empty = document.getElementById('posts-empty');

  if (!userData) return;

  let items = userData.items || [];
  if (statusFilter) {
    items = items.filter(i => i.status === statusFilter);
  }

  if (items.length > 0) {
    tbody.innerHTML = items.map(item => {
      const status = item.status || 'awaiting_approval';
      const type = item.type || 'lost';
      return `
        <tr>
          <td class="font-mono text-sm text-muted">${Utils.escapeHtml(item.display_id || item.id)}</td>
          <td><span class="badge badge-${Utils.escapeHtml(type)}">${Utils.escapeHtml(type)}</span></td>
          <td class="font-weight-500">${Utils.escapeHtml(item.title || '-')}</td>
          <td class="text-sm text-muted">${Utils.escapeHtml(Utils.formatDate(item.created_at) || '-')}</td>
          <td><span class="badge ${Utils.itemStatusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></td>
          <td><a class="btn btn-secondary btn-sm" href="admin-report-detail.html?id=${encodeURIComponent(item.id)}">View</a></td>
        </tr>
      `;
    }).join('');
    empty.classList.add('hidden');
  } else {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
  }
}

function renderActivityLogs() {
  const tbody = document.getElementById('user-activity-tbody');
  const empty = document.getElementById('activity-empty');

  if (!userData) return;
  const logs = userData.activity_logs || [];

  if (logs.length > 0) {
    tbody.innerHTML = logs.map(log => {
      return `
        <tr>
          <td class="text-sm text-muted whitespace-nowrap">${Utils.formatDate(log.created_at)}</td>
          <td><span class="badge badge-secondary">${Utils.escapeHtml(log.action)}</span></td>
          <td class="font-mono text-sm text-muted">${Utils.escapeHtml(log.target_type)} #${log.target_id}</td>
          <td class="font-weight-500">${Utils.escapeHtml(log.admin?.name || 'Unknown')}</td>
          <td class="text-sm text-muted">${Utils.escapeHtml(log.note || '-')}</td>
        </tr>
      `;
    }).join('');
    empty.classList.add('hidden');
  } else {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
  }
}

function renderClaims() {
  const tbody = document.getElementById('user-claims-tbody');
  const empty = document.getElementById('claims-empty');

  if (!userData) return;
  const claims = userData.claims || [];

  if (claims.length > 0) {
    tbody.innerHTML = claims.map(claim => {
      const itemText = claim.item ? `${claim.item.display_id || claim.item.id} - ${claim.item.title}` : `Item #${claim.item_id}`;
      return `
        <tr>
          <td>
            <div class="font-weight-500">${Utils.escapeHtml(itemText)}</div>
          </td>
          <td class="text-sm text-muted whitespace-nowrap">${Utils.formatDate(claim.created_at)}</td>
          <td><span class="badge ${claim.status === 'accepted' ? 'badge-success' : (claim.status === 'rejected' ? 'badge-danger' : 'badge-warning')}">${Utils.escapeHtml(claim.status)}</span></td>
          <td><a class="btn btn-secondary btn-sm" href="admin-report-detail.html?id=${encodeURIComponent(claim.item_id)}">View Item</a></td>
        </tr>
      `;
    }).join('');
    empty.classList.add('hidden');
  } else {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
  }
}

async function handleBanToggle(userId, userName, action) {
  const isBan = action === 'ban';
  const actionText = isBan ? 'suspend' : 'reinstate';
  if (!confirm(`Are you sure you want to ${actionText} ${userName || 'this user'}? This action takes effect immediately.`)) {
    return;
  }

  try {
    const btn = isBan ? document.getElementById('btn-ban') : document.getElementById('btn-unban');
    if (btn) {
      Utils.setButtonLoading(btn, true, 'Processing...');
    }

    if (isBan) {
      await API.admin.banUser(userId);
      Toast.success('User suspended.');
    } else {
      await API.admin.unbanUser(userId);
      Toast.success('User reinstated.');
    }

    initAdminUserDetail();
  } catch (error) {
    Toast.error(error.message || `Failed to ${actionText} user.`);
    initAdminUserDetail();
  }
}
