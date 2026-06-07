document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminDashboard();
});

let weeklyChart = null;
let statusChart = null;
let pendingTotal = 0;

function initAdminDashboard() {
  const dateTarget = document.getElementById('admin-date');
  if (dateTarget) {
    dateTarget.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  bindQuickSearch();
  bindExportButton();
  loadAdminOverview();
}

async function loadAdminOverview() {
  await Promise.all([
    loadStats(),
    loadPendingReports(),
  ]);
}

async function loadStats() {
  try {
    const response = await API.admin.stats();
    const stats = response?.data || {};

    setText('sv-total', stats.total_items || 0);
    setText('sv-pending', stats.pending_items || 0);
    setText('sv-active', stats.items_this_month || 0);
    setText('sv-returned', stats.returned_items || 0);
    setText('ss-pending', Number(stats.pending_items || 0) === 1 ? 'Needs attention' : 'Need attention');
    document.getElementById('pending-pulse')?.classList.toggle('hidden', Number(stats.pending_items || 0) === 0);

    renderWeeklyChart(stats.reports_this_week || []);
    renderStatusChart(stats.status_breakdown || {});
    renderRecentActivity(stats.recent_activity || []);
  } catch (error) {
    Toast.error(error.message || 'Could not load admin stats.');
    renderActivityError(error);
  }
}

async function loadPendingReports() {
  const tbody = document.getElementById('pending-tbody');
  const empty = document.getElementById('pending-empty');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="padding:24px;text-align:center;">Loading reports awaiting approval...</td></tr>';
  empty?.classList.add('hidden');

  try {
    const response = await API.admin.pending();
    const items = getPaginatedItems(response);
    pendingTotal = Number(response?.data?.total ?? items.length);

    setText('pending-count', pendingTotal);
    if (!items.length) {
      tbody.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }

    tbody.innerHTML = items.map(renderPendingRow).join('');
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--color-danger);">${Utils.escapeHtml(error.message || 'Could not load reports awaiting approval.')}</td></tr>`;
    Toast.error(error.message || 'Could not load reports awaiting approval.');
  }
}

function renderPendingRow(item) {
  return `
    <tr data-item-id="${Utils.escapeHtml(item.id)}">
      <td class="font-mono">${Utils.escapeHtml(item.display_id || item.id)}</td>
      <td><span class="badge badge-${Utils.escapeHtml(item.type || 'lost')}">${Utils.escapeHtml(typeLabel(item.type))}</span></td>
      <td title="${Utils.escapeHtml(item.title || '')}">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${Utils.escapeHtml(Utils.truncate(item.title || '-', 30))}</span>
          <span class="badge badge-warning" data-status-badge>Awaiting Approval</span>
        </div>
      </td>
      <td>${Utils.escapeHtml(item.poster?.name || '-')}</td>
      <td title="${Utils.escapeHtml(item.location || '')}">${Utils.escapeHtml(Utils.truncate(item.location || '-', 28))}</td>
      <td>${Utils.escapeHtml(relativeTime(item.created_at))}</td>
      <td>
        <div class="pending-actions">
          <a class="admin-icon-action admin-icon-action--view" href="admin-report-detail.html?id=${encodeURIComponent(item.id)}" title="View details" aria-label="View details">👁</a>
          <button class="admin-icon-action admin-icon-action--approve" type="button" title="Approve post" aria-label="Approve post" data-pending-action="approve" data-item-id="${Utils.escapeHtml(item.id)}">✓</button>
          <button class="admin-icon-action admin-icon-action--reject" type="button" title="Close post" aria-label="Close post" data-pending-action="close" data-item-id="${Utils.escapeHtml(item.id)}">✗</button>
        </div>
      </td>
    </tr>
  `;
}

document.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('[data-pending-action]');
  if (actionButton && actionButton.closest('#pending-tbody')) {
    event.stopPropagation();
    showPendingConfirm(actionButton);
    return;
  }

  const cancelButton = event.target.closest('[data-confirm-cancel]');
  if (cancelButton) {
    event.stopPropagation();
    closePendingConfirm();
    return;
  }

  const approveConfirm = event.target.closest('[data-confirm-approve]');
  if (approveConfirm) {
    event.stopPropagation();
    await approvePendingReport(approveConfirm.dataset.itemId, approveConfirm);
    return;
  }

  const closeConfirm = event.target.closest('[data-confirm-close]');
  if (closeConfirm) {
    event.stopPropagation();
    await closePendingReport(closeConfirm.dataset.itemId, closeConfirm);
    return;
  }

  if (!event.target.closest('.pending-confirm')) {
    closePendingConfirm();
  }
});

async function approvePendingReport(id, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Approving';

  try {
    const response = await API.admin.updateItem(id, { is_approved: true });
    closePendingConfirm();
    finishPendingRow(id, response?.data?.status || 'active', 'approved');
    Toast.success('Report approved.');
  } catch (error) {
    Toast.error(error.message || 'Could not approve report.');
    button.disabled = false;
    button.textContent = original;
  }
}

async function closePendingReport(id, button) {
  const original = button.textContent;
  const reason = document.getElementById(`close-reason-${CSS.escape(String(id))}`)?.value.trim() || '';
  button.disabled = true;
  button.textContent = 'Closing';

  try {
    const payload = { status: 'closed' };
    if (reason) payload.admin_note = reason;
    const response = await API.admin.updateItem(id, payload);
    closePendingConfirm();
    finishPendingRow(id, response?.data?.status || 'closed', 'closed');
    Toast.success('Post closed.');
  } catch (error) {
    Toast.error(error.message || 'Could not close post.');
    button.disabled = false;
    button.textContent = original;
  }
}

function showPendingConfirm(button) {
  const action = button.dataset.pendingAction;
  const id = button.dataset.itemId;
  const actions = button.closest('.pending-actions');
  if (!actions || !id) return;

  closePendingConfirm();
  const popover = document.createElement('div');
  popover.className = 'pending-confirm';
  popover.innerHTML = action === 'approve'
    ? `
      <div class="pending-confirm__title">Approve this post? It will become visible to all students.</div>
      <div class="pending-confirm__actions">
        <button class="btn btn-ghost btn-sm" type="button" data-confirm-cancel>Cancel</button>
        <button class="btn btn-success btn-sm" type="button" data-confirm-approve data-item-id="${Utils.escapeHtml(id)}">Approve</button>
      </div>
    `
    : `
      <div class="pending-confirm__title">Close this post?</div>
      <label class="form-label" for="close-reason-${Utils.escapeHtml(id)}">Reason (optional):</label>
      <input class="form-input" id="close-reason-${Utils.escapeHtml(id)}" type="text" maxlength="160" placeholder="Duplicate, invalid, scam, etc.">
      <div class="pending-confirm__actions">
        <button class="btn btn-ghost btn-sm" type="button" data-confirm-cancel>Cancel</button>
        <button class="btn btn-danger btn-sm" type="button" data-confirm-close data-item-id="${Utils.escapeHtml(id)}">Close Post</button>
      </div>
    `;
  actions.appendChild(popover);
  popover.querySelector('input')?.focus();
}

function closePendingConfirm() {
  document.querySelectorAll('.pending-confirm').forEach((popover) => popover.remove());
}

function finishPendingRow(id, status, tone) {
  const row = document.querySelector(`#pending-tbody tr[data-item-id="${CSS.escape(String(id))}"]`);
  if (!row) return;

  const badge = row.querySelector('[data-status-badge]');
  if (badge) {
    badge.textContent = Utils.itemStatusLabel(status);
    badge.className = `badge ${Utils.itemStatusClass(status)}`;
  }

  row.classList.add(tone === 'closed' ? 'pending-row--closed' : 'pending-row--approved');
  window.setTimeout(() => {
    row.classList.add('pending-row--removing');
    window.setTimeout(() => {
      row.remove();
      syncPendingCountAfterRemoval();
    }, 300);
  }, 450);
}

function syncPendingCountAfterRemoval() {
  const remaining = document.querySelectorAll('#pending-tbody tr[data-item-id]').length;
  pendingTotal = Math.max(0, pendingTotal - 1);
  setText('pending-count', pendingTotal);
  setText('sv-pending', pendingTotal);
  document.getElementById('pending-pulse')?.classList.toggle('hidden', pendingTotal === 0);
  document.getElementById('pending-empty')?.classList.toggle('hidden', remaining !== 0);
}

function bindQuickSearch() {
  const input = document.getElementById('search-post-id');
  const button = document.getElementById('admin-search-btn');

  const runSearch = () => {
    const query = input?.value.trim();
    if (!query) {
      Toast.warning('Enter a Post ID, title, or student name.');
      return;
    }

    window.location.href = `admin-reports.html?search=${encodeURIComponent(query)}`;
  };

  button?.addEventListener('click', runSearch);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });
}

function bindExportButton() {
  document.getElementById('export-report-btn')?.addEventListener('click', () => {
    window.location.href = 'admin-reports.html';
  });
}

function renderWeeklyChart(weekly) {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;

  if (!window.Chart) {
    canvas.replaceWith(chartFallback('Chart.js could not be loaded.'));
    return;
  }

  weeklyChart?.destroy();
  weeklyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weekly.map((day) => day.date),
      datasets: [{
        label: 'Reports',
        data: weekly.map((day) => day.count),
        backgroundColor: 'rgba(212, 89, 10, 0.8)',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

function renderStatusChart(status) {
  const canvas = document.getElementById('status-chart');
  if (!canvas) return;

  if (!window.Chart) {
    canvas.replaceWith(chartFallback('Chart.js could not be loaded.'));
    return;
  }

  statusChart?.destroy();
  statusChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Awaiting Approval', 'Active', 'Claim in Progress', 'Resolved', 'Closed'],
      datasets: [{
        data: [
          status.awaiting_approval || 0,
          status.active || 0,
          status.claim_in_progress || 0,
          status.resolved || 0,
          status.closed || 0,
        ],
        backgroundColor: ['#C47A0A', '#1E8A4A', '#D4590A', '#1B2A4A', '#C93030'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', display: true } },
    },
  });
}

function renderRecentActivity(activity) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  if (!activity.length) {
    feed.innerHTML = '<div class="text-sm text-muted" style="padding:12px 0;">No recent admin activity.</div>';
    return;
  }

  feed.innerHTML = activity.map((entry) => `
    <div class="feed-item">
      <span class="feed-dot" style="background:${activityColor(entry.action)}"></span>
      <div>
        <div class="text-sm font-weight-600">${Utils.escapeHtml(activityText(entry))}</div>
        <div class="text-xs text-muted">${Utils.escapeHtml(entry.admin?.name || 'Admin')} - ${Utils.escapeHtml(relativeTime(entry.created_at))}</div>
      </div>
    </div>
  `).join('');
}

function renderActivityError(error) {
  const feed = document.getElementById('activity-feed');
  if (feed) {
    feed.innerHTML = `<div class="text-sm" style="color:var(--color-danger);padding:12px 0;">${Utils.escapeHtml(error.message || 'Could not load activity.')}</div>`;
  }
}

function getPaginatedItems(response) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function chartFallback(message) {
  const div = document.createElement('div');
  div.className = 'text-sm text-muted';
  div.style.padding = '32px 0';
  div.style.textAlign = 'center';
  div.textContent = message;
  return div;
}

function activityText(entry) {
  const target = entry.target_type && entry.target_id ? ` ${entry.target_type} #${entry.target_id}` : '';
  const note = entry.note ? `: ${entry.note}` : '';
  return `${entry.action || 'updated'}${target}${note}`;
}

function activityColor(action) {
  const value = String(action || '').toLowerCase();
  if (value.includes('approved') || value.includes('resolved')) return '#2E9E5B';
  if (value.includes('deleted') || value.includes('rejected')) return '#C93030';
  return '#D4590A';
}

function typeLabel(type) {
  return type === 'found' ? 'Found' : 'Lost';
}

function relativeTime(value) {
  if (window.Utils?.relativeTime) return Utils.relativeTime(value);
  return value ? new Date(value).toLocaleDateString() : '-';
}

function setText(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = String(value ?? '');
}

