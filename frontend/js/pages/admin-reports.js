document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminReports();
});

function initAdminReports() {
  const params = new URLSearchParams(window.location.search);
  const state = { items: [] };
  const elements = {
    tbody: document.getElementById('all-reports-tbody'),
    empty: document.getElementById('reports-empty'),
    search: document.getElementById('f-id'),
    reporter: document.getElementById('f-reporter'),
    type: document.getElementById('f-type'),
    status: document.getElementById('f-status'),
    category: document.getElementById('f-category'),
    apply: document.getElementById('btn-search'),
    clear: document.getElementById('btn-clear'),
  };

  if (elements.search && params.get('search')) elements.search.value = params.get('search');
  if (elements.status && params.get('status')) elements.status.value = params.get('status');
  if (elements.type && params.get('type')) elements.type.value = params.get('type');
  if (elements.category && params.get('category')) elements.category.value = params.get('category');

  async function loadReports() {
    if (!elements.tbody) return;
    elements.empty?.classList.add('hidden');
    elements.tbody.innerHTML = '<tr><td colspan="9" class="admin-table-message">Loading reports...</td></tr>';

    try {
      const params = {
        per_page: 50,
        search: elements.search?.value.trim() || undefined,
        type: elements.type?.value === 'all' ? undefined : elements.type?.value,
        status: elements.status?.value === 'all' ? undefined : elements.status?.value,
        category: elements.category?.value === 'all' ? undefined : elements.category?.value,
      };
      const response = await API.admin.items(params);
      state.items = response?.data?.data || [];
      const reporterTerm = elements.reporter?.value.trim().toLowerCase();
      const rows = reporterTerm
        ? state.items.filter((item) => `${item.poster?.name || ''} ${item.poster?.email || ''}`.toLowerCase().includes(reporterTerm))
        : state.items;

      elements.tbody.innerHTML = rows.length
        ? rows.map(renderReportRow).join('')
        : '<tr><td colspan="9" class="admin-table-message">No reports found.</td></tr>';
      elements.empty?.classList.toggle('hidden', rows.length > 0);
    } catch (error) {
      elements.tbody.innerHTML = `<tr><td colspan="9" class="admin-table-message admin-table-message--error">${Utils.escapeHtml(error.message)}</td></tr>`;
      Toast.error(error.message || 'Could not load reports.');
    }
  }

  elements.apply?.addEventListener('click', loadReports);
  elements.clear?.addEventListener('click', () => {
    if (elements.search) elements.search.value = '';
    if (elements.reporter) elements.reporter.value = '';
    if (elements.type) elements.type.value = 'all';
    if (elements.status) elements.status.value = 'all';
    if (elements.category) elements.category.value = 'all';
    loadReports();
  });

  [elements.search, elements.reporter].forEach((input) => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadReports();
    });
  });

  loadReports();
}

function renderReportRow(item) {
  const status = item.status || 'awaiting_approval';
  return `
    <tr>
      <td><input type="checkbox" value="${Utils.escapeHtml(item.id)}"></td>
      <td class="font-mono">${Utils.escapeHtml(item.display_id || item.id)}</td>
      <td><span class="badge badge-${Utils.escapeHtml(item.type || 'lost')}">${Utils.escapeHtml(item.type || '-')}</span></td>
      <td>${Utils.escapeHtml(item.title || '-')}</td>
      <td>${item.poster ? `<a href="admin-user-detail.html?id=${encodeURIComponent(item.poster.id)}" class="text-primary hover-underline font-weight-500">${Utils.escapeHtml(item.poster.name)}</a>${item.poster.is_banned ? ' <span class="admin-suspended-icon" title="Suspended">🚫</span>' : ''}` : '-'}</td>
      <td>${Utils.escapeHtml(item.location || '-')}</td>
      <td>${Utils.escapeHtml(Utils.formatDate(item.lost_found_date || item.created_at) || '-')}</td>
      <td><span class="badge ${Utils.itemStatusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></td>
      <td><a class="btn btn-secondary btn-sm" href="admin-report-detail.html?id=${encodeURIComponent(item.id)}">View Details</a></td>
    </tr>
  `;
}
