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
    dateStart: document.getElementById('f-date-start'),
    dateEnd: document.getElementById('f-date-end'),
    apply: document.getElementById('btn-search'),
    clear: document.getElementById('btn-clear'),
  };

  if (elements.search && params.get('search')) elements.search.value = params.get('search');
  if (elements.status && params.get('status')) elements.status.value = params.get('status');
  if (elements.type && params.get('type')) elements.type.value = params.get('type');
  if (elements.category && params.get('category')) elements.category.value = params.get('category');

  let currentPage = parseInt(params.get('page')) || 1;
  let totalPages = 1;
  const paginationControls = document.getElementById('pagination-controls');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const pageInfo = document.getElementById('page-info');

  let selectedIds = new Set();
  const checkAllBtn = document.getElementById('check-all');
  const bulkBar = document.getElementById('bulk-actions');
  const bulkCount = document.getElementById('bulk-count');
  const bulkApproveBtn = document.getElementById('bulk-approve');
  const bulkDelBtn = document.getElementById('bulk-del');
  const bulkClearBtn = document.getElementById('bulk-clear');

  async function loadReports() {
    if (!elements.tbody) return;
    elements.empty?.classList.add('hidden');
    elements.tbody.innerHTML = '<tr><td colspan="9" class="admin-table-message">Loading reports...</td></tr>';
    
    // Reset selection state on reload
    selectedIds.clear();
    updateBulkUI();
    if (checkAllBtn) checkAllBtn.checked = false;

    try {
      const apiParams = {
        per_page: 15,
        page: currentPage,
        search: elements.search?.value.trim() || undefined,
        type: elements.type?.value === 'all' ? undefined : elements.type?.value,
        status: elements.status?.value === 'all' ? undefined : elements.status?.value,
        category: elements.category?.value === 'all' ? undefined : elements.category?.value,
        start_date: elements.dateStart?.value || undefined,
        end_date: elements.dateEnd?.value || undefined,
      };
      
      const response = await API.admin.items(apiParams);
      state.items = response?.data?.data || [];
      totalPages = response?.data?.last_page || 1;
      
      if (paginationControls) {
        paginationControls.classList.remove('hidden');
        btnPrev.disabled = currentPage <= 1;
        btnNext.disabled = currentPage >= totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
      }
      const reporterTerm = elements.reporter?.value.trim().toLowerCase();
      const rows = reporterTerm
        ? state.items.filter((item) => `${item.poster?.name || ''} ${item.poster?.email || ''}`.toLowerCase().includes(reporterTerm))
        : state.items;

      elements.tbody.innerHTML = rows.length
        ? rows.map(renderReportRow).join('')
        : '<tr><td colspan="9" class="admin-table-message">No reports found.</td></tr>';
      elements.empty?.classList.toggle('hidden', rows.length > 0);
      
      bindRowCheckboxes();
    } catch (error) {
      elements.tbody.innerHTML = `<tr><td colspan="9" class="admin-table-message admin-table-message--error">${Utils.escapeHtml(error.message)}</td></tr>`;
      Toast.error(error.message || 'Could not load reports.');
    }
  }

  function bindRowCheckboxes() {
    const checkboxes = elements.tbody.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) selectedIds.add(e.target.value);
        else selectedIds.delete(e.target.value);
        
        if (checkAllBtn) {
          checkAllBtn.checked = checkboxes.length > 0 && selectedIds.size === checkboxes.length;
        }
        updateBulkUI();
      });
    });
  }

  if (checkAllBtn) {
    checkAllBtn.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = elements.tbody.querySelectorAll('.row-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) selectedIds.add(cb.value);
        else selectedIds.delete(cb.value);
      });
      updateBulkUI();
    });
  }

  if (bulkClearBtn) {
    bulkClearBtn.addEventListener('click', () => {
      selectedIds.clear();
      const checkboxes = elements.tbody.querySelectorAll('.row-checkbox');
      checkboxes.forEach(cb => cb.checked = false);
      if (checkAllBtn) checkAllBtn.checked = false;
      updateBulkUI();
    });
  }

  function updateBulkUI() {
    if (!bulkBar || !bulkCount) return;
    bulkCount.textContent = `${selectedIds.size} selected`;
    
    let allPending = true;
    for (const id of selectedIds) {
      const item = state.items.find(i => String(i.id) === String(id));
      if (item && item.status !== 'awaiting_approval') {
        allPending = false;
        break;
      }
    }

    if (bulkApproveBtn) {
      if (selectedIds.size > 0 && allPending) {
        bulkApproveBtn.disabled = false;
        bulkApproveBtn.title = "Approve selected reports";
      } else {
        bulkApproveBtn.disabled = true;
        bulkApproveBtn.title = "Select only the pending reports";
      }
    }

    if (selectedIds.size > 0) {
      bulkBar.classList.add('show');
    } else {
      bulkBar.classList.remove('show');
    }
  }

  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', async () => {
      if (!selectedIds.size) return;
      Utils.setButtonLoading(bulkApproveBtn, true, 'Approving...');
      let successCount = 0;
      let errorCount = 0;
      
      for (const id of selectedIds) {
        try {
          await API.admin.updateItem(id, { is_approved: true });
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      
      Utils.setButtonLoading(bulkApproveBtn, false);
      if (successCount > 0) Toast.success(`Approved ${successCount} reports.`);
      if (errorCount > 0) Toast.error(`Failed to approve ${errorCount} reports.`);
      loadReports();
    });
  }

  if (bulkDelBtn) {
    bulkDelBtn.addEventListener('click', async () => {
      if (!selectedIds.size) return;
      if (!confirm(`Are you sure you want to completely delete ${selectedIds.size} reports? This cannot be undone.`)) return;
      
      Utils.setButtonLoading(bulkDelBtn, true, 'Deleting...');
      let successCount = 0;
      let errorCount = 0;
      
      for (const id of selectedIds) {
        try {
          await API.admin.deleteItem(id);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      
      Utils.setButtonLoading(bulkDelBtn, false);
      if (successCount > 0) Toast.success(`Deleted ${successCount} reports.`);
      if (errorCount > 0) Toast.error(`Failed to delete ${errorCount} reports.`);
      loadReports();
    });
  }

  elements.apply?.addEventListener('click', () => {
    currentPage = 1;
    loadReports();
  });
  elements.clear?.addEventListener('click', () => {
    if (elements.search) elements.search.value = '';
    if (elements.reporter) elements.reporter.value = '';
    if (elements.type) elements.type.value = 'all';
    if (elements.status) elements.status.value = 'all';
    if (elements.category) elements.category.value = 'all';
    if (elements.dateStart) elements.dateStart.value = '';
    if (elements.dateEnd) elements.dateEnd.value = '';
    currentPage = 1;
    loadReports();
  });

  [elements.search, elements.reporter].forEach((input) => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        currentPage = 1;
        loadReports();
      }
    });
  });

  [elements.type, elements.status, elements.category, elements.dateStart, elements.dateEnd].forEach((select) => {
    select?.addEventListener('change', () => {
      currentPage = 1;
      loadReports();
    });
  });

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadReports();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadReports();
      }
    });
  }

  // Export button
  const btnExportReports = document.getElementById('btn-export-reports');
  if (btnExportReports) {
    btnExportReports.addEventListener('click', () => {
      const exportFilters = {};
      const searchVal = elements.search?.value.trim();
      if (searchVal) exportFilters.search = searchVal;
      const typeVal = elements.type?.value;
      if (typeVal && typeVal !== 'all') exportFilters.type = typeVal;
      const statusVal = elements.status?.value;
      if (statusVal && statusVal !== 'all') exportFilters.status = statusVal;
      const categoryVal = elements.category?.value;
      if (categoryVal && categoryVal !== 'all') exportFilters.category = categoryVal;
      const startDate = elements.dateStart?.value;
      if (startDate) exportFilters.start_date = startDate;
      const endDate = elements.dateEnd?.value;
      if (endDate) exportFilters.end_date = endDate;
      window.location.href = API.admin.exportItemsUrl(exportFilters);
    });
  }

  loadReports();
}

function renderReportRow(item) {
  const status = item.status || 'awaiting_approval';
  return `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${Utils.escapeHtml(item.id)}"></td>
      <td class="font-mono text-sm text-muted">${Utils.escapeHtml(item.display_id || item.id)}</td>
      <td><span class="badge badge-${Utils.escapeHtml(item.type || 'lost')}">${Utils.escapeHtml(item.type || '-')}</span></td>
      <td class="font-weight-500">${Utils.escapeHtml(item.title || '-')}</td>
      <td>${item.poster ? `<a href="admin-user-detail.html?id=${encodeURIComponent(item.poster.id)}" class="text-primary hover-underline font-weight-500">${Utils.escapeHtml(item.poster.name)}</a>${item.poster.is_banned ? ' <span class="admin-suspended-icon" title="Suspended">🚫</span>' : ''}` : '-'}</td>
      <td class="text-sm text-muted">${Utils.escapeHtml(item.location || '-')}</td>
      <td class="text-sm text-muted whitespace-nowrap">${Utils.escapeHtml(Utils.formatDate(item.lost_found_date || item.created_at) || '-')}</td>
      <td><span class="badge ${Utils.itemStatusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></td>
      <td><a class="btn btn-secondary btn-sm" href="admin-report-detail.html?id=${encodeURIComponent(item.id)}">View</a></td>
    </tr>
  `;
}
