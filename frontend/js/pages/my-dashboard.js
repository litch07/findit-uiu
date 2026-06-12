document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();

  const state = {
    activeTab: 'all',
    statusFilter: null,
    reports: [],
    allReports: null,
    claimsData: null,
  };

  const tabLabels = {
    all: 'All Reports',
    lost: 'Lost Reports',
    found: 'Found Reports',
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
    claimsReceivedLoading: document.getElementById('claims-received-loading'),
    claimsReceivedList: document.getElementById('claims-received-list'),
    claimsReceivedEmpty: document.getElementById('claims-received-empty'),
    claimsReceivedCount: document.getElementById('claims-received-count'),
    claimsSubmittedLoading: document.getElementById('claims-submitted-loading'),
    claimsSubmittedTableWrap: document.getElementById('claims-submitted-table-wrap'),
    claimsSubmittedTbody: document.getElementById('claims-submitted-tbody'),
    claimsSubmittedEmpty: document.getElementById('claims-submitted-empty'),
    claimsSubmittedCount: document.getElementById('claims-submitted-count'),
    claimDetailModal: document.getElementById('claim-detail-modal'),
    claimDetailBody: document.getElementById('claim-detail-body'),
    claimDetailItemLink: document.getElementById('claim-detail-item-link'),
  };

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
    const filteredItems = state.statusFilter
      ? items.filter((item) => Utils.normalizeItemStatus(item.status) === Utils.normalizeItemStatus(state.statusFilter))
      : items;

    state.reports = filteredItems;

    if (!filteredItems.length) {
      setReportsMode('empty');
      return;
    }

    elements.tbody.innerHTML = filteredItems.map((item, index) => {
      const type = item.type || '';
      const status = item.status || 'awaiting_approval';
      const category = item.category?.name || 'Uncategorized';
      const date = item.lost_found_date || item.created_at;

      return `
        <tr data-item-id="${Utils.escapeHtml(item.id)}">
          <td>${index + 1}</td>
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
          <td>
            <div class="table-actions">
              ${status === 'claim_in_progress' ? `<button class="btn btn-success btn-sm" type="button" data-resolve-item-id="${Utils.escapeHtml(item.id)}" title="Mark as Resolved">Mark Resolved ✓</button>` : ''}
              <a class="icon-action" href="item-detail.html?id=${encodeURIComponent(item.id)}" title="View report" aria-label="View report">👁</a>
              <button class="icon-action icon-action--danger" type="button" data-delete-id="${Utils.escapeHtml(item.id)}" title="Delete report" aria-label="Delete report">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    setReportsMode('table');
  }

  async function loadReports() {
    setReportsMode('loading');

    const filters = { per_page: 100 };
    const type = reportTypeByTab[state.activeTab];
    if (type) filters.type = type;

    try {
      const response = await API.items.mine(filters);
      renderReports(getItemsFromResponse(response));
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

  async function loadStats() {
    elements.statLost.textContent = '...';
    elements.statFound.textContent = '...';
    elements.statRecovered.textContent = '...';
    elements.statReturned.textContent = '...';

    try {
      const response = await API.auth.me();
      const user = response.data || {};
      Auth.setUser({ ...(Auth.getUser() || {}), ...user });

      elements.statLost.textContent = user.items_lost ?? 0;
      elements.statFound.textContent = user.items_found ?? 0;
      elements.statRecovered.textContent = user.items_recovered ?? 0;
      elements.statReturned.textContent = user.items_returned ?? 0;
    } catch (error) {
      elements.statLost.textContent = '0';
      elements.statFound.textContent = '0';
      elements.statRecovered.textContent = '0';
      elements.statReturned.textContent = '0';
      Toast.error(error.message || 'Could not load dashboard stats.');
    }
  }

  async function loadClaimsReceived() {
    setClaimsReceivedMode('loading');

    try {
      const { received } = await loadClaimsData();
      elements.claimsReceivedCount.textContent = `${received.length} ${received.length === 1 ? 'claim' : 'claims'}`;

      if (!received.length) {
        setClaimsReceivedMode('empty');
        return;
      }

      elements.claimsReceivedList.innerHTML = renderReceivedClaims(received);
      setClaimsReceivedMode('list');
    } catch (error) {
      elements.claimsReceivedList.innerHTML = `<div class="dashboard-error">${Utils.escapeHtml(error.message || 'Could not load claims.')}</div>`;
      setClaimsReceivedMode('list');
      Toast.error(error.message || 'Could not load claims.');
    }
  }

  async function loadClaimsSubmitted() {
    setClaimsSubmittedMode('loading');

    try {
      const { submitted } = await loadClaimsData();
      elements.claimsSubmittedCount.textContent = `${submitted.length} ${submitted.length === 1 ? 'claim' : 'claims'}`;

      if (!submitted.length) {
        setClaimsSubmittedMode('empty');
        return;
      }

      elements.claimsSubmittedTbody.innerHTML = submitted.map(renderSubmittedClaimRow).join('');
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
          <h3 class="claim-item-section__title">${Utils.escapeHtml(item.title || 'Untitled item')}</h3>
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
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
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
            <span class="claim-avatar">${Utils.escapeHtml(initials(claimer.name))}</span>
            <div>
              <span class="claim-person__name">${Utils.escapeHtml(claimer.name || 'Unknown student')}</span>
              <span class="claim-muted">${Utils.escapeHtml(claimer.student_id || claimer.email || '')}</span>
            </div>
          </div>
        </td>
        <td>${relationshipBadge(claim.relationship_type)}</td>
        <td>${Utils.escapeHtml(Utils.formatDate(claim.created_at) || '-')}</td>
        <td>${claimStatusBadge(status)}</td>
        <td>
          <div class="claim-actions">
            <button class="icon-action" type="button" data-claim-action="view" data-claim-id="${Utils.escapeHtml(claim.id)}" title="View details" aria-label="View details">👁</button>
            <button class="icon-action" type="button" data-claim-action="message-claimer" data-with-id="${Utils.escapeHtml(claimer.id || claim.claimer_id)}" data-item-id="${Utils.escapeHtml(item.id || claim.item_id)}" title="Message claimer" aria-label="Message claimer">💬</button>
            ${status === 'pending' ? `
              <button class="icon-action" type="button" data-claim-action="accept" data-claim-id="${Utils.escapeHtml(claim.id)}" title="Accept claim" aria-label="Accept claim">✓</button>
              <button class="icon-action icon-action--danger" type="button" data-claim-action="reject" data-claim-id="${Utils.escapeHtml(claim.id)}" title="Reject claim" aria-label="Reject claim">✗</button>
            ` : ''}
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
        <td>${claimStatusBadge(status)}</td>
        <td>${Utils.escapeHtml(Utils.formatDate(claim.created_at) || '-')}</td>
        <td>
          <div class="claim-actions">
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

  function activateTab(tab) {
    state.activeTab = tab;
    elements.title.textContent = tabLabels[tab] || tabLabels.all;

    elements.tabs.forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });

    const isStats = tab === 'stats';
    const isClaimsReceived = tab === 'claims-received';
    const isClaimsSubmitted = tab === 'claims-submitted';
    const isReportTab = !isStats && !isClaimsReceived && !isClaimsSubmitted;

    elements.postButton.classList.toggle('hidden', !isReportTab);
    elements.reportsPanel.classList.toggle('hidden', !isReportTab);
    elements.statsPanel.classList.toggle('hidden', !isStats);
    elements.claimsReceivedPanel.classList.toggle('hidden', !isClaimsReceived);
    elements.claimsSubmittedPanel.classList.toggle('hidden', !isClaimsSubmitted);

    if (isStats) {
      loadStats();
    } else if (isClaimsReceived) {
      loadClaimsReceived();
    } else if (isClaimsSubmitted) {
      loadClaimsSubmitted();
    } else {
      loadReports();
    }
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
    const label = button.textContent;
    button.disabled = true;
    button.textContent = status === 'accepted' ? 'Accepting...' : 'Rejecting...';

    try {
      await API.claims.update(id, { status });
      state.claimsData = null;
      Toast.success(status === 'accepted' ? 'Claim accepted.' : 'Claim rejected.');
      await loadClaimsReceived();
    } catch (error) {
      Toast.error(error.message || 'Could not update claim.');
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  async function markClaimItemResolved(claim, button) {
    const item = claim?.item || {};
    const label = button?.textContent || 'Yes, Mark as Resolved';
    if (button) {
      button.disabled = true;
      button.textContent = 'Resolving...';
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
        button.disabled = false;
        button.textContent = label;
      }
    }
  }

  function cancelClaim(id, button) {
    Utils.showConfirmModal('Cancel Claim', 'Cancel this claim?', async () => {
      const label = button.textContent;
      button.disabled = true;
      button.textContent = 'Cancelling...';

      try {
        await API.claims.delete(id);
        state.claimsData = null;
        Toast.success('Claim cancelled.');
        await loadClaimsSubmitted();
      } catch (error) {
        Toast.error(error.message || 'Could not cancel claim.');
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  }

  async function startConversation(withId, itemId) {
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
        <div class="claim-detail-card" style="margin-bottom:14px;">
          <span class="claim-detail-label">Review note</span>
          <div class="claim-detail-text">${Utils.escapeHtml(claim.admin_note)}</div>
        </div>
      ` : ''}
      <div class="claim-detail-card" style="margin-bottom:14px;">
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
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="claim-resolve-title" style="max-width:520px;">
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
      state.statusFilter = null;
      activateTab(button.dataset.tab);
    });
  });

  elements.retry.addEventListener('click', loadReports);

  elements.tbody.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (deleteButton) {
      deleteReport(deleteButton.dataset.deleteId);
      return;
    }

    const resolveButton = event.target.closest('[data-resolve-item-id]');
    if (resolveButton) {
      Utils.showConfirmModal('Confirm Resolution', "Are you sure? This confirms the item was returned and cannot be undone.", () => {
        resolveItemFromDashboard(resolveButton.dataset.resolveItemId, resolveButton);
      });
    }
  });

  async function resolveItemFromDashboard(id, button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Resolving...';

    try {
      await API.items.update(id, { status: 'resolved' });
      state.allReports = null;
      Toast.success('Item marked as resolved. Great outcome!');
      await loadReports();
    } catch (error) {
      Toast.error(error.message || 'Could not mark report resolved.');
      button.disabled = false;
      button.textContent = label;
    }
  }

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
