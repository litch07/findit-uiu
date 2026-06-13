document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminUsers();
});

let state = {
  data: [],
  filters: {
    q: '',
    role: '',
    status: '',
    page: 1,
    per_page: 15,
    sort: 'created_at',
    direction: 'desc'
  },
  pagination: null,
  stats: null,
  isLoading: false
};

const elements = {
  tbody: document.getElementById('users-tbody'),
  emptyState: document.getElementById('users-empty'),
  
  filterSearch: document.getElementById('filter-search'),
  filterRole: document.getElementById('filter-role'),
  filterStatusTabs: document.getElementById('filter-status-tabs'),
  
  btnExport: document.getElementById('btn-export'),
  
  statTotal: document.getElementById('stat-total'),
  statActive: document.getElementById('stat-active'),
  statSuspended: document.getElementById('stat-suspended'),
  statUnverified: document.getElementById('stat-unverified'),
  
  paginationControls: document.getElementById('pagination-controls'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pageInfo: document.getElementById('page-info')
};

async function initAdminUsers() {
  bindEvents();
  await loadUsers();
}

function bindEvents() {
  let debounceTimer;
  elements.filterSearch?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.filters.q = e.target.value.trim();
      state.filters.page = 1;
      loadUsers();
    }, 300);
  });

  elements.filterRole?.addEventListener('change', (e) => {
    state.filters.role = e.target.value;
    state.filters.page = 1;
    loadUsers();
  });

  if (elements.filterStatusTabs) {
    const tabs = elements.filterStatusTabs.querySelectorAll('.admin-filter-pill');
    
    function setStatusFilter(status) {
      tabs.forEach(t => t.classList.remove('active'));
      const activeTab = Array.from(tabs).find(t => t.dataset.status === status) || tabs[0];
      if (activeTab) activeTab.classList.add('active');
      
      state.filters.status = status;
      state.filters.page = 1;
      loadUsers();
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        setStatusFilter(e.target.dataset.status);
      });
    });

    document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
      card.addEventListener('click', () => {
        setStatusFilter(card.dataset.filter);
        
        // Optional: Scroll to filters so user sees table update
        if (elements.filterStatusTabs) {
          elements.filterStatusTabs.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  elements.btnExport?.addEventListener('click', () => {
    const exportFilters = {};
    if (state.filters.q) exportFilters.q = state.filters.q;
    if (state.filters.role) exportFilters.role = state.filters.role;
    if (state.filters.status) exportFilters.status = state.filters.status;
    window.location.href = API.admin.exportUsersUrl(exportFilters);
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sort = th.dataset.sort;
      if (state.filters.sort === sort) {
        state.filters.direction = state.filters.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.filters.sort = sort;
        state.filters.direction = th.dataset.dir || 'asc';
      }
      
      document.querySelectorAll('th.sortable').forEach(t => {
        t.classList.remove('active');
        const icon = t.querySelector('.sort-icon');
        if (icon) icon.textContent = '';
      });
      
      th.classList.add('active');
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = state.filters.direction === 'asc' ? '↑' : '↓';
      }
      
      state.filters.page = 1;
      loadUsers();
    });
  });

  elements.btnPrev?.addEventListener('click', () => {
    if (state.pagination && state.pagination.current_page > 1) {
      state.filters.page--;
      loadUsers();
    }
  });

  elements.btnNext?.addEventListener('click', () => {
    if (state.pagination && state.pagination.current_page < state.pagination.last_page) {
      state.filters.page++;
      loadUsers();
    }
  });
}

async function loadUsers() {
  if (state.isLoading) return;
  state.isLoading = true;
  
  elements.tbody.innerHTML = `<tr><td colspan="7" class="admin-table-message">Loading users...</td></tr>`;
  elements.emptyState.classList.add('hidden');
  elements.paginationControls.classList.add('hidden');

  try {
    const params = {
      q: state.filters.q,
      role: state.filters.role,
      status: state.filters.status,
      page: state.filters.page,
      per_page: state.filters.per_page,
      sort: state.filters.sort,
      direction: state.filters.direction
    };
    
    // Remove empty params
    Object.keys(params).forEach(key => (params[key] === '' || params[key] == null) && delete params[key]);

    const response = await API.admin.users(params);
    state.data = response.data.data || [];
    state.pagination = response.data;
    state.stats = response.stats || null;

    renderStats();
    renderTable();
    updatePagination();
  } catch (error) {
    Toast.error(error.message || 'Failed to load users.');
    elements.tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error loading users.</td></tr>`;
  } finally {
    state.isLoading = false;
  }
}

function renderStats() {
  if (!state.stats) return;
  if (elements.statTotal) elements.statTotal.textContent = state.stats.total || 0;
  if (elements.statActive) elements.statActive.textContent = state.stats.active || 0;
  if (elements.statSuspended) elements.statSuspended.textContent = state.stats.suspended || 0;
  if (elements.statUnverified) elements.statUnverified.textContent = state.stats.unverified || 0;
}

function renderTable() {
  if (!state.data.length) {
    elements.tbody.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.tbody.innerHTML = state.data.map(user => {
    const isBanned = user.is_banned === true;
    const isUnverified = user.email_verified_at === null;
    let statusBadge = '';
    
    if (isBanned) {
      statusBadge = '<span class="badge badge-danger">Suspended</span>';
    } else if (isUnverified) {
      statusBadge = '<span class="badge badge-warning">Unverified</span>';
    } else {
      statusBadge = '<span class="badge badge-success">Active</span>';
    }
      
    const roleBadge = user.role === 'admin'
      ? '<span class="badge badge-primary">Admin</span>'
      : '';

    const nameParts = (user.name || '').trim().split(/\s+/);
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0]?.[0] || 'U').toUpperCase();

    // Generate dynamic color based on name
    let hash = 0;
    const nameStr = user.name || 'User';
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const avatarColor = `hsl(${hue}, 70%, 40%)`;

    const avatarHtml = user.avatar_url 
      ? `<img src="${Utils.escapeHtml(user.avatar_url)}" class="admin-avatar" style="object-fit: cover;" alt="Avatar">`
      : `<div class="admin-avatar" style="background-color: ${avatarColor};">${initials}</div>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            ${avatarHtml}
            <div>
              <div class="font-weight-500">${Utils.escapeHtml(user.name)} ${roleBadge}</div>
              <div class="text-xs text-muted">${Utils.escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td class="font-mono text-sm">${Utils.escapeHtml(user.student_id || '-')}</td>
        <td><span class="badge badge-secondary">${user.post_count || 0}</span></td>
        <td>${statusBadge}</td>
        <td class="text-sm">${Utils.formatDate(user.created_at)}</td>
        <td class="text-right">
          <a href="admin-user-detail.html?id=${user.id}" class="btn btn-secondary btn-sm">View Profile</a>
        </td>
      </tr>
    `;
  }).join('');
}

function updatePagination() {
  if (!state.pagination || state.pagination.last_page <= 1) {
    elements.paginationControls.classList.add('hidden');
    return;
  }

  elements.paginationControls.classList.remove('hidden');
  elements.pageInfo.textContent = `Page ${state.pagination.current_page} of ${state.pagination.last_page}`;
  
  elements.btnPrev.disabled = state.pagination.current_page <= 1;
  elements.btnNext.disabled = state.pagination.current_page >= state.pagination.last_page;
}
