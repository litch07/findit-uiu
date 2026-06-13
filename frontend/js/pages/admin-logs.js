document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  
  const searchInput = document.getElementById('filter-search');
  const actionFilter = document.getElementById('filter-action');
  const tbody = document.getElementById('logs-tbody');
  const emptyState = document.getElementById('logs-empty');
  const paginationContainer = document.getElementById('logs-pagination');
  
  let currentPage = 1;
  let currentSearch = '';
  let currentAction = '';
  let debounceTimeout = null;

  async function fetchLogs(page = 1) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner mx-auto"></div></td></tr>';
    emptyState.classList.add('hidden');
    paginationContainer.innerHTML = '';

    try {
      const filters = { page, per_page: 15 };
      if (currentSearch) filters.q = currentSearch;
      if (currentAction) filters.action = currentAction;

      const response = await API.admin.logs(filters);
      // apiCall returns the raw JSON payload: { success, data: LaravelPaginator }
      const paginator = response?.data || {};
      renderLogs(Array.isArray(paginator.data) ? paginator.data : []);
      renderPagination(paginator);
    } catch (error) {
      console.error('Error fetching logs:', error);
      Toast.error(error.message || 'Failed to load activity log');
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.textContent = 'Error loading logs. Please try again later.';
    }
  }

  function formatTimestamp(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    // "May 31, 2026 at 3:45 PM"
    return date.toLocaleDateString('en-US', options).replace(',', ',').replace(/(\d{4}) /, '$1 at ');
  }

  function getActionBadge(action) {
    let label = 'Unknown';
    let className = 'log-action-badge';
    
    switch (action) {
      case 'approved':
        label = 'Approved Post';
        className += ' log-action-badge--approved';
        break;
      case 'rejected':
        label = 'Rejected Post';
        className += ' log-action-badge--rejected';
        break;
      case 'status_changed':
        label = 'Post Edited';
        className += ' log-action-badge--edited';
        break;
      case 'resolved':
        label = 'Resolved';
        className += ' log-action-badge--resolved';
        break;
      case 'deleted':
        label = 'Deleted Post';
        className += ' log-action-badge--deleted';
        break;

      default:
        label = action.replace(/_/g, ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        break;
    }
    
    return `<span class="${className}">${Utils.escapeHtml(label)}</span>`;
  }

  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = logs.map(log => {
      const timeFormatted = formatTimestamp(log.created_at);
      const adminName = log.admin?.name || 'Unknown Admin';
      const adminId = log.admin?.student_id || 'System';
      const initials = adminName.substring(0, 2).toUpperCase();
      
      const avatarHtml = log.admin?.avatar_url 
        ? `<img src="${Utils.escapeHtml(log.admin.avatar_url)}" class="log-admin-avatar" style="object-fit: cover;" alt="Avatar">`
        : `<div class="log-admin-avatar">${initials}</div>`;
      
      let targetHtml = '-';
      if (log.target_type === 'item') {
        targetHtml = `<a href="admin-report-detail.html?id=${log.target_id}" class="log-target-link">Post #${log.target_id}</a>`;
      } else if (log.target_type === 'user') {
        targetHtml = `<a href="admin-user-detail.html?id=${log.target_id}" class="log-target-link">User #${log.target_id}</a>`;
      } else {
        targetHtml = `${Utils.escapeHtml(log.target_type)} #${log.target_id}`;
      }

      return `
        <tr>
          <td><div class="log-time">${timeFormatted}</div></td>
          <td>
            <div class="log-admin">
              ${avatarHtml}
              <div class="log-admin-info">
                <span class="log-admin-name">${Utils.escapeHtml(adminName)}</span>
                <span class="log-admin-id">${Utils.escapeHtml(adminId)}</span>
              </div>
            </div>
          </td>
          <td>${getActionBadge(log.action)}</td>
          <td>${targetHtml}</td>
          <td><div class="log-notes">${log.note ? Utils.escapeHtml(log.note) : '<span class="text-muted italic">No notes provided</span>'}</div></td>
        </tr>
      `;
    }).join('');
  }

  function renderPagination(paginationData) {
    if (!paginationData || paginationData.last_page <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const { current_page, last_page } = paginationData;
    
    let html = `
      <button class="btn btn-secondary btn-sm" id="btn-prev" ${current_page <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="pagination-info text-sm" style="align-self: center;">Page ${current_page} of ${last_page}</span>
      <button class="btn btn-secondary btn-sm" id="btn-next" ${current_page >= last_page ? 'disabled' : ''}>Next</button>
    `;
    
    paginationContainer.innerHTML = html;
    
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (current_page > 1) {
          currentPage = current_page - 1;
          fetchLogs(currentPage);
        }
      });
    }
    
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (current_page < last_page) {
          currentPage = current_page + 1;
          fetchLogs(currentPage);
        }
      });
    }
  }

  // Event Listeners for Filters
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      fetchLogs(currentPage);
    }, 500);
  });

  actionFilter.addEventListener('change', (e) => {
    currentAction = e.target.value;
    currentPage = 1;
    fetchLogs(currentPage);
  });

  // Export button
  const btnExportLogs = document.getElementById('btn-export-logs');
  if (btnExportLogs) {
    btnExportLogs.addEventListener('click', () => {
      const exportFilters = {};
      if (currentSearch) exportFilters.q = currentSearch;
      if (currentAction) exportFilters.action = currentAction;
      window.location.href = API.admin.exportLogsUrl(exportFilters);
    });
  }

  // Initial fetch
  initNavbar();
  fetchLogs(currentPage);
});
