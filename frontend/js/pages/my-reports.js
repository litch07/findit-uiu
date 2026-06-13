document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();

  const state = {
    activeTab: 'all',
    statusFilter: null,
    searchQuery: '',
    sortOrder: 'newest',
    claimsReceivedSortOrder: 'newest',
    claimsSubmittedSortOrder: 'newest',
    claimsReceivedStatusFilter: 'all',
    claimsSubmittedStatusFilter: 'all',
    page: 1,
    perPage: 10,
    reports: [],
    allReports: null,
    claimsData: null,
  };

  let isInitialLoad = true;

  const tabLabels = {
    all: 'All Reports',
    lost: 'Lost Reports',
    found: 'Found Reports',
    pending: 'Pending Approval',
    stats: 'My Stats',
    'claims-received': 'Claims on My Posts',
    'claims-submitted': 'My Submitted Claims',
  };

  const reportTypeByTab = {
    lost: 'lost',
    found: 'found',
  };

  const elements = {
    tabs: document.querySelectorAll('.dashboard-tab'),
    title: document.getElementById('dashboard-title'),
    postButton: document.getElementById('post-report-btn'),
    reportsPanel: document.getElementById('reports-panel'),
    statsPanel: document.getElementById('stats-panel'),
    claimsReceivedPanel: document.getElementById('claims-received-panel'),
    claimsSubmittedPanel: document.getElementById('claims-submitted-panel'),
    loading: document.getElementById('reports-loading'),
    tableWrap: document.getElementById('reports-table-wrap'),
    tbody: document.getElementById('reports-tbody'),
    empty: document.getElementById('reports-empty'),
    error: document.getElementById('reports-error'),
    errorMessage: document.getElementById('reports-error-message'),
    retry: document.getElementById('reports-retry'),
    statLost: document.getElementById('stat-lost'),
    statFound: document.getElementById('stat-found'),
    statRecovered: document.getElementById('stat-recovered'),
    statReturned: document.getElementById('stat-returned'),
    claimsSubmittedEmpty: document.getElementById('claims-submitted-empty'),
    claimDetailModal: document.getElementById('claim-detail-modal'),
    claimDetailBody: document.getElementById('claim-detail-body'),
    claimDetailItemLink: document.getElementById('claim-detail-item-link'),

    dashboardSubtitle: document.getElementById('dashboard-subtitle'),
    dashboardFilters: document.getElementById('dashboard-filters'),
    dashboardSearch: document.getElementById('dashboard-search'),
    dashboardStatusFilter: document.getElementById('dashboard-status-filter'),
    dashboardSort: document.getElementById('dashboard-sort'),
    reportsPagination: document.getElementById('reports-pagination'),
    
    claimsReceivedSubtitle: document.getElementById('claims-received-subtitle'),
    claimsReceivedFilters: document.getElementById('claims-received-filters'),
    claimsReceivedSearch: document.getElementById('claims-received-search'),
    claimsReceivedSort: document.getElementById('claims-received-sort'),
    claimsReceivedStatus: document.getElementById('claims-received-status'),
    claimsReceivedPagination: document.getElementById('claims-received-pagination'),
    claimsReceivedLoading: document.getElementById('claims-received-loading'),
    claimsReceivedList: document.getElementById('claims-received-list'),
    claimsReceivedEmpty: document.getElementById('claims-received-empty'),

    claimsSubmittedSubtitle: document.getElementById('claims-submitted-subtitle'),
    claimsSubmittedFilters: document.getElementById('claims-submitted-filters'),
    claimsSubmittedSearch: document.getElementById('claims-submitted-search'),
    claimsSubmittedSort: document.getElementById('claims-submitted-sort'),
    claimsSubmittedStatus: document.getElementById('claims-submitted-status'),
    claimsSubmittedPagination: document.getElementById('claims-submitted-pagination'),
    claimsSubmittedLoading: document.getElementById('claims-submitted-loading'),
    claimsSubmittedTableWrap: document.getElementById('claims-submitted-table-wrap'),
  };

  function renderPagination(total, containerId, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.max(1, Math.ceil(total / state.perPage));
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const buttons = [];
    buttons.push(`<button class="page-btn" type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>‹</button>`);

    for (let p = 1; p <= totalPages; p++) {
      buttons.push(`<button class="page-btn ${p === state.page ? 'active' : ''}" type="button" data-page="${p}">${p}</button>`);
    }

    buttons.push(`<button class="page-btn" type="button" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''}>›</button>`);
    container.innerHTML = buttons.join('');

    container.onclick = (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      onPageClick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  function setReportsMode(mode) {
    elements.loading.classList.toggle('hidden', mode !== 'loading');
    elements.tableWrap.classList.toggle('hidden', mode !== 'table');
    elements.empty.classList.toggle('hidden', mode !== 'empty');
    elements.error.classList.toggle('hidden', mode !== 'error');
  }

  function setClaimsReceivedMode(mode) {
    elements.claimsReceivedLoading.classList.toggle('hidden', mode !== 'loading');
    elements.claimsReceivedList.classList.toggle('hidden', mode !== 'list');
    elements.claimsReceivedEmpty.classList.toggle('hidden', mode !== 'empty');
  }

  function setClaimsSubmittedMode(mode) {
    elements.claimsSubmittedLoading.classList.toggle('hidden', mode !== 'loading');
    elements.claimsSubmittedTableWrap.classList.toggle('hidden', mode !== 'table');
    elements.claimsSubmittedEmpty.classList.toggle('hidden', mode !== 'empty');
  }

  function getItemsFromResponse(response) {
    const payload = response?.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function formatType(type) {
    return type === 'found' ? 'Found' : 'Lost';
  }

  function statusClass(status) {
    return `badge--${Utils.normalizeItemStatus(status).replaceAll('_', '-')}`;
  }

  function renderReports(items) {
    let filteredItems = items;

    if (state.statusFilter && state.statusFilter !== 'all') {
      filteredItems = filteredItems.filter((item) => Utils.normalizeItemStatus(item.status) === Utils.normalizeItemStatus(state.statusFilter));
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) || 
        (item.location && item.location.toLowerCase().includes(q))
      );
    }

    filteredItems.sort((a, b) => {
      const t1 = new Date(a.lost_found_date || a.created_at || 0).getTime();
      const t2 = new Date(b.lost_found_date || b.created_at || 0).getTime();
      return state.sortOrder === 'oldest' ? t1 - t2 : t2 - t1;
    });

    state.reports = filteredItems;
    const total = filteredItems.length;

    if (elements.dashboardSubtitle) {
      elements.dashboardSubtitle.textContent = `${total} ${total === 1 ? 'report' : 'reports'} found`;
    }

    if (!total) {
      const h3 = elements.empty.querySelector('h3');
      const p = elements.empty.querySelector('p');
      if (h3 && p) {
        if (state.activeTab === 'lost') {
          h3.textContent = 'No lost reports yet';
          p.textContent = 'Post a lost item report to start tracking it here.';
        } else if (state.activeTab === 'found') {
          h3.textContent = 'No found reports yet';
          p.textContent = 'Post a found item report to start tracking it here.';
        } else if (state.activeTab === 'pending') {
          h3.textContent = 'No pending reports';
          p.textContent = 'You have no reports awaiting administrator approval.';
        } else {
          h3.textContent = 'No reports yet';
          p.textContent = 'Post a lost or found item to start tracking it here.';
        }
      }
      setReportsMode('empty');
      if (elements.reportsPagination) elements.reportsPagination.innerHTML = '';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.perPage;
    const pageItems = filteredItems.slice(start, start + state.perPage);

    const tbody = document.getElementById('reports-tbody');
    if(tbody) tbody.innerHTML = pageItems.map((item, index) => {
      const actualIndex = start + index + 1;
      const type = item.type || '';
      const status = item.status || 'awaiting_approval';
      const category = item.category?.name || 'Uncategorized';
      const date = item.lost_found_date || item.created_at;

      return `
        <tr class="clickable-row" data-item-id="${Utils.escapeHtml(item.id)}" data-status="${Utils.escapeHtml(status)}">
          <td>${actualIndex}</td>
          <td>
            <div class="item-cell">
              <span class="item-cell__title">${Utils.escapeHtml(item.title || 'Untitled item')}</span>
              <span class="item-cell__meta">${Utils.escapeHtml(category)}</span>
            </div>
          </td>
          <td><span class="badge badge--${type === 'found' ? 'found' : 'lost'}">${Utils.escapeHtml(formatType(type))}</span></td>
          <td>${Utils.escapeHtml(item.location || '-')}</td>
          <td>${Utils.escapeHtml(Utils.formatDate(date) || '-')}</td>
          <td><span class="badge ${statusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></td>
        </tr>
      `;
    }).join('');

    renderPagination(total, 'reports-pagination', () => renderReports(items));
    setReportsMode('table');
  }

  async function loadReports() {
    setReportsMode('loading');

    try {
      const response = await API.items.mine({ per_page: 100 });
      const items = getItemsFromResponse(response);
      state.allReports = items;

      const counts = {
        all: items.length,
        lost: 0,
        found: 0,
        resolved: 0,
        pending: 0,
      };

      items.forEach(item => {
        if (item.type === 'lost') counts.lost++;
        if (item.type === 'found') counts.found++;
        
        const status = Utils.normalizeItemStatus(item.status);
        if (status === 'resolved') counts.resolved++;
        if (status === 'awaiting_approval') counts.pending++;
      });
      
      const setC = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count > 0 ? `(${count})` : '';
      };
      setC('count-all', counts.all);
      setC('count-lost', counts.lost);
      setC('count-found', counts.found);
      setC('count-resolved', counts.resolved);
      setC('count-pending', counts.pending);

      let filteredItems = items;
      if (state.activeTab === 'pending') {
        filteredItems = filteredItems.filter(i => Utils.normalizeItemStatus(i.status) === 'awaiting_approval');
      } else {
        const type = reportTypeByTab[state.activeTab];
        if (type) {
          filteredItems = filteredItems.filter(i => i.type === type);
        }
      }

      if (elements.dashboardFilters) elements.dashboardFilters.classList.remove('hidden');
      if (elements.dashboardStatusFilter) elements.dashboardStatusFilter.value = state.statusFilter || 'all';
      if (elements.dashboardSearch) elements.dashboardSearch.value = state.searchQuery || '';
      if (elements.dashboardSort) elements.dashboardSort.value = state.sortOrder || 'newest';

      renderReports(filteredItems);
    } catch (error) {
      elements.errorMessage.textContent = error.message || 'Please try again.';
      setReportsMode('error');
      Toast.error(error.message || 'Could not load reports.');
    }
  }

  async function loadAllReportsForStats() {
    if (state.allReports) return state.allReports;

    const response = await API.items.mine({ per_page: 100 });
    state.allReports = getItemsFromResponse(response);
    return state.allReports;
  }

  async function loadClaimsData(force = false) {
    if (state.claimsData && !force) return state.claimsData;

    const response = await API.claims.mine();
    state.claimsData = {
      received: Array.isArray(response?.data?.received_claims) ? response.data.received_claims : [],
      submitted: Array.isArray(response?.data?.submitted_claims) ? response.data.submitted_claims : [],
    };
    return state.claimsData;
  }



  async function loadClaimsReceived() {
    setClaimsReceivedMode('loading');

    if (elements.claimsReceivedFilters) elements.claimsReceivedFilters.classList.remove('hidden');
    if (elements.claimsReceivedSearch) elements.claimsReceivedSearch.value = state.searchQuery || '';

    try {
      const { received } = await loadClaimsData();
      
      let filtered = received;

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          (c.item?.title || '').toLowerCase().includes(q) ||
          (c.claimer?.name || '').toLowerCase().includes(q)
        );
      }

      if (state.claimsReceivedStatusFilter !== 'all') {
        filtered = filtered.filter(c => normalizeClaimStatus(c.status) === state.claimsReceivedStatusFilter);
      }

      filtered.sort((a, b) => {
        const t1 = new Date(a.created_at || 0).getTime();
        const t2 = new Date(b.created_at || 0).getTime();
        return state.claimsReceivedSortOrder === 'oldest' ? t1 - t2 : t2 - t1;
      });

      const total = filtered.length;
      
      const el = document.getElementById('count-claims-received');
      if (el) el.textContent = total > 0 ? `(${total})` : '';

      if (!total) {
        setClaimsReceivedMode('empty');
        if (elements.claimsReceivedPagination) elements.claimsReceivedPagination.innerHTML = '';
        return;
      }

      const totalPages = Math.max(1, Math.ceil(total / state.perPage));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * state.perPage;
      const pageItems = filtered.slice(start, start + state.perPage);

      elements.claimsReceivedList.innerHTML = renderReceivedClaims(pageItems);
      renderPagination(total, 'claims-received-pagination', () => loadClaimsReceived());
      setClaimsReceivedMode('list');
    } catch (error) {
      elements.claimsReceivedList.innerHTML = `<div class="dashboard-error">${Utils.escapeHtml(error.message || 'Could not load claims.')}</div>`;
      setClaimsReceivedMode('list');
      Toast.error(error.message || 'Could not load claims.');
    }
  }

  async function loadClaimsSubmitted() {
    setClaimsSubmittedMode('loading');

    if (elements.claimsSubmittedFilters) elements.claimsSubmittedFilters.classList.remove('hidden');
    if (elements.claimsSubmittedSearch) elements.claimsSubmittedSearch.value = state.searchQuery || '';

    try {
      const { submitted } = await loadClaimsData();
      
      let filtered = submitted;

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          (c.item?.title || '').toLowerCase().includes(q) ||
          (c.item?.location || '').toLowerCase().includes(q)
        );
      }

      if (state.claimsSubmittedStatusFilter !== 'all') {
        filtered = filtered.filter(c => normalizeClaimStatus(c.status) === state.claimsSubmittedStatusFilter);
      }

      filtered.sort((a, b) => {
        const t1 = new Date(a.created_at || 0).getTime();
        const t2 = new Date(b.created_at || 0).getTime();
        return state.claimsSubmittedSortOrder === 'oldest' ? t1 - t2 : t2 - t1;
      });

      const total = filtered.length;

      const el = document.getElementById('count-claims-submitted');
      if (el) el.textContent = total > 0 ? `(${total})` : '';

      if (!total) {
        setClaimsSubmittedMode('empty');
        if (elements.claimsSubmittedPagination) elements.claimsSubmittedPagination.innerHTML = '';
        return;
      }

      const totalPages = Math.max(1, Math.ceil(total / state.perPage));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * state.perPage;
      const pageItems = filtered.slice(start, start + state.perPage);

      elements.claimsSubmittedTbody.innerHTML = pageItems.map(renderSubmittedClaimRow).join('');
      renderPagination(total, 'claims-submitted-pagination', () => loadClaimsSubmitted());
      setClaimsSubmittedMode('table');
    } catch (error) {
      elements.claimsSubmittedTbody.innerHTML = `<tr><td colspan="5">${Utils.escapeHtml(error.message || 'Could not load claims.')}</td></tr>`;
      setClaimsSubmittedMode('table');
      Toast.error(error.message || 'Could not load claims.');
    }
  }

  function renderReceivedClaims(claims) {
    return groupClaimsByItem(claims).map(({ item, claims: itemClaims }) => `
      <section class="claim-item-section">
        <div class="claim-item-section__head">
          <h3 class="claim-item-section__title">
            <a class="claim-item-link" href="item-detail.html?id=${encodeURIComponent(item.id)}" style="text-decoration: none;">${Utils.escapeHtml(item.title || 'Untitled item')}</a>
          </h3>
          <div class="claim-item-section__meta">
            <span class="badge">${itemClaims.length} ${itemClaims.length === 1 ? 'claim' : 'claims'}</span>
            ${itemStatusBadge(item.status)}
          </div>
        </div>
        <div class="claim-table-wrap">
          <table class="claim-table">
            <thead>
              <tr>
                <th>Claimer</th>
                <th>Relationship</th>
                <th>Date Submitted</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${itemClaims.map(renderReceivedClaimRow).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `).join('');
  }

  function renderReceivedClaimRow(claim) {
    const claimer = claim.claimer || {};
    const status = normalizeClaimStatus(claim.status);
    const item = claim.item || {};

    return `
      <tr data-claim-id="${Utils.escapeHtml(claim.id)}">
        <td>
          <div class="claim-person">
            <a href="user-profile.html?id=${encodeURIComponent(claimer.id)}" class="claim-avatar" style="text-decoration: none;">${Utils.escapeHtml(initials(claimer.name))}</a>
            <div>
              <a href="user-profile.html?id=${encodeURIComponent(claimer.id)}" class="claim-person__name" style="text-decoration: none;">${Utils.escapeHtml(claimer.name || 'Unknown student')}</a>
              <span class="claim-muted">${Utils.escapeHtml(claimer.student_id || claimer.email || '')}</span>
            </div>
          </div>
        </td>
        <td>${relationshipBadge(claim.relationship_type)}</td>
        <td>${Utils.escapeHtml(Utils.formatDate(claim.created_at) || '-')}</td>
        <td class="text-center">${claimStatusBadge(status)}</td>
        <td class="text-center">
          <div class="claim-actions justify-center">
            <button class="icon-action" type="button" data-claim-action="message-claimer" data-with-id="${Utils.escapeHtml(claimer.id || claim.claimer_id)}" data-item-id="${Utils.escapeHtml(item.id || claim.item_id)}" title="Message claimer" aria-label="Message claimer">💬</button>
            ${status === 'pending' ? `
              <button class="icon-action" type="button" data-claim-action="accept" data-claim-id="${Utils.escapeHtml(claim.id)}" title="Accept claim" aria-label="Accept claim">✓</button>
              <button class="icon-action icon-action--danger" type="button" data-claim-action="reject" data-claim-id="${Utils.escapeHtml(claim.id)}" title="Reject claim" aria-label="Reject claim">✗</button>
            ` : ''}
            <button class="icon-action" type="button" data-claim-action="view" data-claim-id="${Utils.escapeHtml(claim.id)}" title="View details" aria-label="View details">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderSubmittedClaimRow(claim) {
    const item = claim.item || {};
    const poster = item.poster || {};
    const status = normalizeClaimStatus(claim.status);

    return `
      <tr data-claim-id="${Utils.escapeHtml(claim.id)}">
        <td>
          <div class="submitted-item">
            <span class="submitted-item__icon">${itemEmoji(item.type)}</span>
            <div>
              <a class="claim-item-link" href="item-detail.html?id=${encodeURIComponent(item.id || claim.item_id)}">${Utils.escapeHtml(item.title || 'Untitled item')}</a>
              <span class="claim-muted">${Utils.escapeHtml(poster.name ? `Reporter: ${poster.name}` : '')}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge--${item.type === 'found' ? 'found' : 'lost'}">${Utils.escapeHtml(formatType(item.type))}</span></td>
        <td class="text-center">${claimStatusBadge(status)}</td>
        <td>${Utils.escapeHtml(Utils.formatDate(claim.created_at) || '-')}</td>
        <td class="text-center">
          <div class="claim-actions justify-center">
            ${submittedClaimAction(claim, status)}
          </div>
        </td>
      </tr>
    `;
  }

  function submittedClaimAction(claim, status) {
    const item = claim.item || {};
    const poster = item.poster || {};
    const conversationId = claim.conversation_id || claim.conversation?.id;

    if (status === 'pending') {
      return `<button class="btn btn-danger-outline btn-sm" type="button" data-claim-action="cancel" data-claim-id="${Utils.escapeHtml(claim.id)}">Cancel Claim</button>`;
    }

    if (status === 'accepted') {
      if (conversationId) {
        return `<a class="btn btn-primary btn-sm" href="messages.html?id=${encodeURIComponent(conversationId)}">💬 Open Chat</a>`;
      }
      return `<button class="btn btn-secondary btn-sm" type="button" data-claim-action="message-reporter" data-with-id="${Utils.escapeHtml(poster.id || item.posted_by)}" data-item-id="${Utils.escapeHtml(item.id || claim.item_id)}">💬 Open Chat</button>`;
    }

    if (status === 'resolved') {
      return `<span class="claim-action-label claim-action-label--resolved">Resolved ✔️</span>`;
    }

    if (status === 'rejected') {
      return `<span class="claim-action-label claim-action-label--rejected">Rejected</span>`;
    }

    return `<button class="btn btn-secondary btn-sm" type="button" data-claim-action="view" data-claim-id="${Utils.escapeHtml(claim.id)}">View Details</button>`;
  }

  function groupClaimsByItem(claims) {
    const groups = new Map();

    claims.forEach((claim) => {
      const item = claim.item || {};
      const key = String(item.id || claim.item_id || 'unknown');
      if (!groups.has(key)) {
        groups.set(key, { item, claims: [] });
      }
      groups.get(key).claims.push(claim);
    });

    return Array.from(groups.values());
  }

  async function loadStatsTab() {
    try {
      const items = await loadAllReportsForStats();
      const counts = { lost: 0, found: 0, recovered: 0, returned: 0 };
      items.forEach(item => {
        if (item.type === 'lost') counts.lost++;
        if (item.type === 'found') counts.found++;
        const status = Utils.normalizeItemStatus(item.status);
        if (status === 'resolved') {
          if (item.type === 'lost') counts.recovered++;
          if (item.type === 'found') counts.returned++;
        }
      });
      if (elements.statLost) elements.statLost.textContent = counts.lost;
      if (elements.statFound) elements.statFound.textContent = counts.found;
      if (elements.statRecovered) elements.statRecovered.textContent = counts.recovered;
      if (elements.statReturned) elements.statReturned.textContent = counts.returned;
    } catch (e) {
      console.error("Could not load stats", e);
    }
  }

  function activateTab(tab) {
    if (state.activeTab !== tab) {
      state.page = 1;
      state.searchQuery = '';
      state.sortOrder = 'newest';
    }
    state.activeTab = tab;
    elements.title.textContent = tabLabels[tab] || tabLabels.all;
    if (elements.dashboardSubtitle) {
      if (tab === 'claims-received') {
        elements.dashboardSubtitle.textContent = 'Review claims submitted on items you posted';
      } else if (tab === 'claims-submitted') {
        elements.dashboardSubtitle.textContent = 'Track claims you submitted on other items';
      } else if (tab === 'stats') {
        elements.dashboardSubtitle.textContent = 'Your overall reporting statistics';
      } else if (tab === 'pending') {
        elements.dashboardSubtitle.textContent = 'Track your reports awaiting administrator approval';
      } else {
        elements.dashboardSubtitle.textContent = 'Manage your lost and found items';
      }
    }

    elements.tabs.forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });

    const isClaimsReceived = tab === 'claims-received';
    const isClaimsSubmitted = tab === 'claims-submitted';
    const isStats = tab === 'stats';
    const isReportTab = tab === 'all' || tab === 'lost' || tab === 'found' || tab === 'pending';

    if (elements.postButton) {
      elements.postButton.classList.toggle('hidden', !isReportTab);
    }
    elements.reportsPanel.classList.toggle('hidden', !isReportTab);
    if (elements.dashboardFilters) elements.dashboardFilters.classList.toggle('hidden', !isReportTab);
    elements.claimsReceivedPanel.classList.toggle('hidden', !isClaimsReceived);
    elements.claimsSubmittedPanel.classList.toggle('hidden', !isClaimsSubmitted);
    if (elements.statsPanel) elements.statsPanel.classList.toggle('hidden', !isStats);

    if (isClaimsReceived) {
      loadClaimsReceived();
    } else if (isClaimsSubmitted) {
      loadClaimsSubmitted();
    } else if (isStats) {
      loadStatsTab();
    } else {
      if (!isInitialLoad) {
        state.statusFilter = 'all';
      }
      loadReports();
    }
    isInitialLoad = false;
  }

  function deleteReport(id) {
    Utils.showConfirmModal('Confirm Deletion', 'Delete this report? This action cannot be undone.', async () => {
      try {
        await API.items.delete(id);
        state.allReports = null;
        state.claimsData = null;
        Toast.success('Report deleted.');
        renderReports(state.reports.filter((item) => String(item.id) !== String(id)));
      } catch (error) {
        Toast.error(error.message || 'Could not delete report.');
      }
    });
  }

  async function updateClaimStatus(id, status, button) {
    if (button) Utils.setButtonLoading(button, true, status === 'accepted' ? 'Accepting...' : 'Rejecting...');

    try {
      await API.claims.update(id, { status });
      state.claimsData = null;
      Toast.success(status === 'accepted' ? 'Claim accepted.' : 'Claim rejected.');
      await loadClaimsReceived();
    } catch (error) {
      Toast.error(error.message || 'Could not update claim.');
    } finally {
      if (button) Utils.setButtonLoading(button, false);
    }
  }

  async function markClaimItemResolved(claim, button) {
    const item = claim?.item || {};
    if (button) {
      Utils.setButtonLoading(button, true, 'Resolving...');
    }

    try {
      await API.items.update(item.id || claim.item_id, { status: 'resolved' });
      closeResolutionDialog();
      state.claimsData = null;
      state.allReports = null;
      Toast.success('Report marked resolved.');
      await loadClaimsReceived();
    } catch (error) {
      Toast.error(error.message || 'Could not mark report resolved.');
    } finally {
      if (button) {
        Utils.setButtonLoading(button, false);
      }
    }
  }

  function cancelClaim(id, button) {
    Utils.showConfirmModal('Cancel Claim', 'Cancel this claim?', async () => {
      if (button) Utils.setButtonLoading(button, true, 'Cancelling...');

      try {
        await API.claims.delete(id);
        state.claimsData = null;
        Toast.success('Claim cancelled.');
        await loadClaimsSubmitted();
      } catch (error) {
        Toast.error(error.message || 'Could not cancel claim.');
      } finally {
        if (button) Utils.setButtonLoading(button, false);
      }
    });
  }

  async function startConversation(withId, itemId) {
    if (!itemId) {
      Toast.error('Could not determine related item ID.');
      return;
    }
    try {
      const response = await API.messages.start(withId, itemId);
      const id = response?.data?.id;
      window.location.href = id ? `messages.html?id=${encodeURIComponent(id)}` : 'messages.html';
    } catch (error) {
      Toast.error(error.message || 'Could not open conversation.');
    }
  }

  function openClaimDetail(id) {
    const claim = findClaim(id);
    if (!claim || !elements.claimDetailModal || !elements.claimDetailBody) return;

    const claimer = claim.claimer || {};
    const item = claim.item || {};
    elements.claimDetailBody.innerHTML = `
      <div class="claim-detail-grid">
        ${detailCard('Claimer', `${claimer.name || 'Unknown student'}${claimer.student_id ? `\n${claimer.student_id}` : ''}`)}
        ${detailCard('Relationship', relationshipLabel(claim.relationship_type))}
        ${detailCard('Preferred location', claim.preferred_location || '-')}
        ${detailCard('Availability', claim.availability || '-')}
      </div>
      ${claim.admin_note ? `
        <div class="claim-detail-card claim-detail-card--spaced">
          <span class="claim-detail-label">Review note</span>
          <div class="claim-detail-text">${Utils.escapeHtml(claim.admin_note)}</div>
        </div>
      ` : ''}
      <div class="claim-detail-card claim-detail-card--spaced">
        <span class="claim-detail-label">Full proof text</span>
        <div class="claim-detail-text">${Utils.escapeHtml(claim.proof_text || '-')}</div>
      </div>
      <div class="claim-detail-card">
        <span class="claim-detail-label">Full message</span>
        <div class="claim-detail-text">${Utils.escapeHtml(claim.message || '-')}</div>
      </div>
    `;
    elements.claimDetailItemLink.href = `item-detail.html?id=${encodeURIComponent(item.id || claim.item_id || '')}`;
    elements.claimDetailModal.classList.remove('hidden');
    window.requestAnimationFrame(() => elements.claimDetailModal.classList.add('open'));
    elements.claimDetailModal.setAttribute('aria-hidden', 'false');
  }

  function closeClaimDetail() {
    if (!elements.claimDetailModal) return;

    elements.claimDetailModal.classList.remove('open');
    elements.claimDetailModal.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => elements.claimDetailModal.classList.add('hidden'), 180);
  }

  function openResolutionDialog(id) {
    const claim = findClaim(id);
    if (!claim) return;

    ensureResolutionDialog();
    const modal = document.getElementById('claim-resolve-modal');
    if (!modal) return;

    modal.dataset.claimId = claim.id;
    document.getElementById('claim-resolve-claimer').textContent = claim.claimer?.name || 'the claimer';
    modal.classList.remove('hidden');
    window.requestAnimationFrame(() => modal.classList.add('open'));
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('claim-resolve-confirm')?.focus();
  }

  function closeResolutionDialog() {
    const modal = document.getElementById('claim-resolve-modal');
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => modal.classList.add('hidden'), 180);
  }

  function ensureResolutionDialog() {
    let modal = document.getElementById('claim-resolve-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="claim-resolve-modal" class="modal-bg hidden" aria-hidden="true">
          <div class="modal modal--narrow" role="dialog" aria-modal="true" aria-labelledby="claim-resolve-title">
            <div class="modal__header">
              <h2 id="claim-resolve-title" class="modal__title">Confirm Resolution</h2>
              <button type="button" class="modal__close" id="claim-resolve-close" aria-label="Close resolution dialog">&times;</button>
            </div>
            <div class="modal__body">
              <p class="text-base">By marking this item as resolved, you confirm that <strong id="claim-resolve-claimer"></strong> has received the item.</p>
              <p class="text-sm text-muted">This will:</p>
              <ul class="claim-resolution-list">
                <li>&#10003; Close the item and remove it from active listings</li>
                <li>&#10003; Count as a successful recovery for both parties</li>
                <li>&#10003; Close the messaging thread</li>
              </ul>
              <p class="text-sm font-weight-700 m-0">This action cannot be undone.</p>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn-ghost" id="claim-resolve-cancel">Cancel</button>
              <button type="button" class="btn btn-success" id="claim-resolve-confirm">Yes, Mark as Resolved</button>
            </div>
          </div>
        </div>
      `);
      modal = document.getElementById('claim-resolve-modal');
    }

    if (!modal || modal.dataset.ready) return;
    modal.dataset.ready = 'true';
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeResolutionDialog();
    });
    document.getElementById('claim-resolve-close')?.addEventListener('click', closeResolutionDialog);
    document.getElementById('claim-resolve-cancel')?.addEventListener('click', closeResolutionDialog);
    document.getElementById('claim-resolve-confirm')?.addEventListener('click', async (event) => {
      await markClaimItemResolved(findClaim(modal.dataset.claimId), event.currentTarget);
    });
  }

  function findClaim(id) {
    const claims = state.claimsData
      ? [...state.claimsData.received, ...state.claimsData.submitted]
      : [];
    return claims.find((claim) => String(claim.id) === String(id));
  }

  function detailCard(label, value) {
    return `
      <div class="claim-detail-card">
        <span class="claim-detail-label">${Utils.escapeHtml(label)}</span>
        <div class="claim-detail-text">${Utils.escapeHtml(value || '-')}</div>
      </div>
    `;
  }

  function itemStatusBadge(status) {
    const normalized = Utils.normalizeItemStatus(status);
    return `<span class="badge ${statusClass(normalized)}">${Utils.escapeHtml(Utils.itemStatusLabel(normalized))}</span>`;
  }

  function claimStatusBadge(status) {
    return `<span class="claim-status claim-status--${Utils.escapeHtml(status)}">${Utils.escapeHtml(capitalize(status))}</span>`;
  }

  function relationshipBadge(value) {
    return `<span class="relationship-badge">${Utils.escapeHtml(relationshipLabel(value))}</span>`;
  }

  function relationshipLabel(value) {
    if (value === 'owner') return 'Original owner';
    if (value === 'behalf') return 'On behalf';
    if (value === 'found_it') return 'Found Report';
    return value || 'Claim';
  }

  function normalizeClaimStatus(status) {
    return String(status || 'pending').trim().toLowerCase();
  }

  function capitalize(value) {
    const text = String(value || '');
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
  }

  function initials(name) {
    return String(name || 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U';
  }

  function itemEmoji(type) {
    return type === 'found' ? '📦' : '📤';
  }

  elements.tabs.forEach((button) => {
    button.addEventListener('click', () => {
      activateTab(button.dataset.tab);
    });
  });

  elements.retry.addEventListener('click', loadReports);

  elements.dashboardSearch?.addEventListener('input', () => {
    state.searchQuery = elements.dashboardSearch.value;
    state.page = 1;
    clearTimeout(elements.dashboardSearch.dataset.timer);
    elements.dashboardSearch.dataset.timer = setTimeout(() => {
      const items = state.allReports || [];
      let filteredItems = items;
      const type = reportTypeByTab[state.activeTab];
      if (type) filteredItems = filteredItems.filter(i => i.type === type);
      renderReports(filteredItems);
    }, 250);
  });

  elements.dashboardStatusFilter?.addEventListener('change', () => {
    state.statusFilter = elements.dashboardStatusFilter.value;
    state.page = 1;
    const items = state.allReports || [];
    let filteredItems = items;
    const type = reportTypeByTab[state.activeTab];
    if (type) filteredItems = filteredItems.filter(i => i.type === type);
    renderReports(filteredItems);
  });

  elements.dashboardSort?.addEventListener('change', () => {
    state.sortOrder = elements.dashboardSort.value;
    state.page = 1;
    const items = state.allReports || [];
    let filteredItems = items;
    const type = reportTypeByTab[state.activeTab];
    if (type) filteredItems = filteredItems.filter(i => i.type === type);
    renderReports(filteredItems);
  });

  elements.claimsReceivedSearch?.addEventListener('input', () => {
    state.searchQuery = elements.claimsReceivedSearch.value;
    state.page = 1;
    clearTimeout(elements.claimsReceivedSearch.dataset.timer);
    elements.claimsReceivedSearch.dataset.timer = setTimeout(loadClaimsReceived, 250);
  });

  elements.claimsSubmittedSearch?.addEventListener('input', () => {
    state.searchQuery = elements.claimsSubmittedSearch.value;
    state.page = 1;
    clearTimeout(elements.claimsSubmittedSearch.dataset.timer);
    elements.claimsSubmittedSearch.dataset.timer = setTimeout(loadClaimsSubmitted, 250);
  });

  elements.claimsReceivedStatus?.addEventListener('change', () => {
    state.claimsReceivedStatusFilter = elements.claimsReceivedStatus.value;
    state.page = 1;
    loadClaimsReceived();
  });

  elements.claimsSubmittedStatus?.addEventListener('change', () => {
    state.claimsSubmittedStatusFilter = elements.claimsSubmittedStatus.value;
    state.page = 1;
    loadClaimsSubmitted();
  });

  elements.claimsReceivedSort?.addEventListener('change', () => {
    state.claimsReceivedSortOrder = elements.claimsReceivedSort.value;
    state.page = 1;
    loadClaimsReceived();
  });

  elements.claimsSubmittedSort?.addEventListener('change', () => {
    state.claimsSubmittedSortOrder = elements.claimsSubmittedSort.value;
    state.page = 1;
    loadClaimsSubmitted();
  });

  elements.tbody.addEventListener('click', (event) => {
    const tr = event.target.closest('.clickable-row');
    if (tr && tr.dataset.itemId) {
      window.location.href = `item-detail.html?id=${encodeURIComponent(tr.dataset.itemId)}`;
    }
  });

  document.querySelector('.my-dashboard-content')?.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-claim-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.claimAction;
    const claimId = actionButton.dataset.claimId;

    if (action === 'view') {
      openClaimDetail(claimId);
      return;
    }

    if (action === 'accept' || action === 'reject') {
      await updateClaimStatus(claimId, action === 'accept' ? 'accepted' : 'rejected', actionButton);
      return;
    }

    if (action === 'resolve') {
      openResolutionDialog(claimId);
      return;
    }

    if (action === 'cancel') {
      await cancelClaim(claimId, actionButton);
      return;
    }

    if (action === 'message-claimer' || action === 'message-reporter') {
      await startConversation(actionButton.dataset.withId, actionButton.dataset.itemId);
    }
  });

  elements.claimsReceivedList?.addEventListener('click', (event) => {
    if (event.target.closest('.claim-actions button')) return;
    const tr = event.target.closest('.clickable-row');
    if (tr && tr.dataset.claimId) openClaimDetail(tr.dataset.claimId);
  });

  elements.claimsSubmittedTbody?.addEventListener('click', (event) => {
    if (event.target.closest('.claim-actions button')) return;

    const tr = event.target.closest('.clickable-row');
    if (tr && tr.dataset.claimId) {
      openClaimDetail(tr.dataset.claimId);
    }
  });

  elements.claimDetailModal?.addEventListener('click', (event) => {
    if (event.target === elements.claimDetailModal) closeClaimDetail();
  });
  document.getElementById('claim-detail-close')?.addEventListener('click', closeClaimDetail);
  document.getElementById('claim-detail-dismiss')?.addEventListener('click', closeClaimDetail);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.claimDetailModal?.classList.contains('open')) {
      closeClaimDetail();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const statusParam = params.get('status');

  const initialTab = Object.prototype.hasOwnProperty.call(tabLabels, tabParam) ? tabParam : 'all';

  state.statusFilter = statusParam || null;
  activateTab(initialTab);
});
