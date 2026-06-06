document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initItemDetail();
});

async function initItemDetail() {
  const id = Utils.getParam('id');
  const main = document.querySelector('main');
  if (!id || !main) {
    Utils.showError(main, 'Missing item id.');
    return;
  }

  try {
    const response = await API.items.get(id);
    renderItem(response.data);
  } catch (error) {
    Utils.showError(main, error.message || 'Could not load item.');
  }
}

function renderItem(item) {
  const user = Auth.getUser() || {};
  const ownerId = item.posted_by || item.poster?.id;
  const isOwner = Number(ownerId) === Number(user.id);

  setText('bc-title', item.title);
  setText('type-badge', item.type || 'Item');
  setStatusBadge('status-badge', item.status);
  setText('item-title', item.title);
  setText('item-ref', item.display_id || item.id);
  setText('item-views', `${item.view_count || 0} views`);
  setText('item-desc', item.description || 'No description provided.');
  setText('detail-category', item.category?.name || '-');
  renderLocationField(item, isOwner);
  setText('detail-date', Utils.formatDate(item.lost_found_date || item.created_at));
  setText('detail-time', item.lost_found_time || '-');
  setText('detail-color', item.color || '-');
  setText('detail-spot', item.specific_spot || '-');
  setText('poster-name', item.poster?.name || 'Unknown user');
  setText('poster-dept', item.poster?.department || '');
  setText('poster-since', item.poster?.created_at ? `Member since ${Utils.formatDate(item.poster.created_at)}` : '');
  setText('poster-count', item.poster?.student_id || '');
  setText('poster-avatar', initials(item.poster?.name));

  renderImage(item);
  renderTags(item.tags || []);
  renderActions(item, isOwner);
  renderInlineEdit(item, isOwner);
  renderOwnerLocationSection(item, false);
  renderSimilar(item);
}

function renderImage(item) {
  const image = item.images?.[0]?.image_url || item.images?.[0]?.url || item.images?.[0]?.path || '';
  const mainImage = document.getElementById('main-img');
  const noImage = document.getElementById('no-img-icon');
  if (!mainImage || !noImage) return;

  if (image) {
    mainImage.src = imageSrc(image);
    mainImage.alt = item.title || 'Item image';
    mainImage.style.display = '';
    noImage.style.display = 'none';
  } else {
    mainImage.style.display = 'none';
    noImage.style.display = 'block';
  }
}

function renderTags(tags) {
  const tagsContainer = document.querySelector('#tags-row .tags-container');
  if (!tagsContainer) return;
  tagsContainer.innerHTML = tags.length
    ? tags.map((tag) => `<span class="badge">${Utils.escapeHtml(tag.tag || tag.name || tag)}</span>`).join('')
    : '<span class="text-sm text-muted">No tags</span>';
}

function renderActions(item, isOwner) {
  const claimBtn = document.getElementById('claim-btn');
  const msgBtn = document.getElementById('msg-btn');
  const actionCard = document.getElementById('action-card');
  const user = Auth.getUser() || {};
  const itemStatus = Utils.normalizeItemStatus(item.status);
  const isResolved = itemStatus === 'resolved';

  if (isOwner) {
    const acceptedClaim = acceptedClaimFor(item);
    const canResolve = itemStatus === 'claim_in_progress';
    const canReportProblem = isResolved;
    claimBtn?.classList.add('hidden');
    msgBtn?.classList.add('hidden');
    if (actionCard) {
      actionCard.innerHTML = `
        <div class="poster-card">
          <h4 class="action-card-heading">Owner Options</h4>
          ${canResolve ? '<button class="btn btn-success btn-full" type="button" id="owner-resolve-btn">Mark as Resolved ✓</button>' : ''}
          <button class="btn btn-danger-outline btn-full mt-3" type="button" id="owner-delete-btn">Delete Report</button>
          ${canReportProblem ? '<div class="report-problem-wrap"><button class="report-problem-link" type="button" id="owner-problem-btn">Report a Problem</button></div>' : ''}
        </div>
      `;
      document.getElementById('owner-resolve-btn')?.addEventListener('click', () => openResolveModal(item, acceptedClaim));
      document.getElementById('owner-delete-btn')?.addEventListener('click', () => deleteOwnerReport(item.id));
      if (canReportProblem) {
        initReportProblemLink(document.getElementById('owner-problem-btn'), item);
      }
    }
    return;
  }

  // Non-owner path — check if this user is the accepted claimer
  const isClaimer = isResolved && isAcceptedClaimerUser(item, Number(user.id));

  const isActive = itemStatus === 'active';
  claimBtn?.classList.toggle('hidden', !isActive);
  msgBtn?.classList.remove('hidden');
  if (claimBtn && isActive && item.type === 'lost') {
    claimBtn.textContent = 'I May Have Found This';
    claimBtn.onclick = () => openFoundReportModal(item);
  } else if (claimBtn && isActive) {
    claimBtn.textContent = 'Submit Claim Request';
    claimBtn.onclick = () => {
      window.location.href = `claim.html?item_id=${encodeURIComponent(item.id)}`;
    };
  }
  if (msgBtn) {
    msgBtn.href = 'messages.html';
    msgBtn.onclick = async (event) => {
      event.preventDefault();
      try {
        const response = await API.messages.start(item.poster?.id || item.posted_by, item.id);
        window.location.href = `messages.html?id=${encodeURIComponent(response.data.id)}`;
      } catch (error) {
        Toast.error(error.message || 'Could not start conversation.');
      }
    };
  }

  // Claimer "Report a Problem" link — injected below the main action buttons
  if (isClaimer) {
    const actionsWrap = document.querySelector('.item-detail-elem-119');
    if (actionsWrap && !actionsWrap.querySelector('.report-problem-link')) {
      const wrap = document.createElement('div');
      wrap.className = 'report-problem-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'report-problem-link';
      btn.id = 'claimer-problem-btn';
      btn.textContent = 'Report a Problem';
      wrap.appendChild(btn);
      actionsWrap.appendChild(wrap);
      initReportProblemLink(btn, item);
    }
  }
}

function isAcceptedClaimerUser(item, userId) {
  const claims = Array.isArray(item.claims) ? item.claims : [];
  return claims.some(
    (c) => ['accepted', 'resolved'].includes(String(c.status || '').toLowerCase()) &&
      Number(c.claimer_id || c.claimer?.id) === userId
  );
}

function initReportProblemLink(btn, item) {
  if (!btn) return;
  const lsKey = `findit_scam_reported_${item.id}`;
  const alreadyReported = localStorage.getItem(lsKey) === '1';
  if (alreadyReported) {
    markReportProblemDone(btn);
    return;
  }
  btn.addEventListener('click', () => openScamReportModal(item));
}

function markReportProblemDone(btn) {
  if (!btn) return;
  btn.textContent = 'Problem Reported ✓';
  btn.disabled = true;
  btn.classList.add('report-problem-link--done');
}

async function markOwnerResolved(id, button) {
  const label = button?.textContent || 'Yes, Mark as Resolved';
  if (button) {
    button.disabled = true;
    button.textContent = 'Resolving...';
  }
  try {
    await API.items.update(id, { status: 'resolved' });
    closeResolveModal();
    Toast.success('Item marked as resolved. Great outcome!');
    initItemDetail();
  } catch (error) {
    Toast.error(error.message || 'Could not mark report resolved.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = label;
    }
  }
}

function acceptedClaimFor(item) {
  const claims = Array.isArray(item.claims) ? item.claims : [];
  return claims.find((claim) => ['accepted', 'resolved'].includes(String(claim.status || '').toLowerCase())) || null;
}

function openResolveModal(item, claim) {
  ensureResolveModalReady();
  const modal = document.getElementById('resolve-modal');
  if (!modal) return;

  const claimerName = claim?.claimer?.name || 'the claimer';
  document.getElementById('resolve-claimer-name').textContent = claimerName;
  modal.dataset.itemId = item.id;
  modal.classList.remove('hidden');
  window.requestAnimationFrame(() => modal.classList.add('open'));
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('resolve-confirm-btn')?.focus();
}

function closeResolveModal() {
  const modal = document.getElementById('resolve-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => modal.classList.add('hidden'), 180);
}

function ensureResolveModalReady() {
  let modal = document.getElementById('resolve-modal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="resolve-modal" class="modal-bg hidden" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="resolve-title" style="max-width:520px;">
          <div class="modal__header">
            <h2 id="resolve-title" class="modal__title">Confirm Resolution</h2>
            <button type="button" class="modal__close" id="resolve-close" aria-label="Close resolution dialog">&times;</button>
          </div>
          <div class="modal__body">
            <p class="text-base">Are you sure? This confirms the item was returned and cannot be undone.</p>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn-ghost" id="resolve-cancel">Cancel</button>
            <button type="button" class="btn btn-success" id="resolve-confirm-btn">Yes, Mark as Resolved</button>
          </div>
        </div>
      </div>
    `);
    modal = document.getElementById('resolve-modal');
  }

  if (!modal || modal.dataset.ready) return;
  modal.dataset.ready = 'true';
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeResolveModal();
  });
  document.getElementById('resolve-close')?.addEventListener('click', closeResolveModal);
  document.getElementById('resolve-cancel')?.addEventListener('click', closeResolveModal);
  document.getElementById('resolve-confirm-btn')?.addEventListener('click', async (event) => {
    await markOwnerResolved(modal.dataset.itemId, event.currentTarget);
  });
}

function renderOwnerLocationSection(item, isOwner) {
  const section = document.getElementById('owner-location-section');
  const display = document.getElementById('owner-location-display');
  const input = document.getElementById('owner-location-input');
  const form = document.getElementById('owner-location-form');
  if (!section || !display || !input || !form) return;

  section.classList.toggle('hidden', !isOwner);
  if (!isOwner) return;

  const currentLocation = item.location || '';
  section.dataset.itemId = item.id;
  display.textContent = currentLocation || 'Not specified';
  input.value = currentLocation;
  closeOwnerLocationEditor();

  if (!section.dataset.ready) {
    section.dataset.ready = 'true';
    document.getElementById('owner-location-edit-btn')?.addEventListener('click', openOwnerLocationEditor);
    document.getElementById('owner-location-cancel-btn')?.addEventListener('click', closeOwnerLocationEditor);
    form.addEventListener('submit', submitOwnerLocationUpdate);
    section.querySelectorAll('[data-location-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        input.value = button.dataset.locationPreset || '';
        input.focus();
      });
    });
  }
}

function openOwnerLocationEditor() {
  const section = document.getElementById('owner-location-section');
  const form = document.getElementById('owner-location-form');
  const input = document.getElementById('owner-location-input');
  if (!section || section.classList.contains('hidden') || !form) return;

  form.classList.remove('hidden');
  input?.focus();
  input?.select();
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeOwnerLocationEditor() {
  document.getElementById('owner-location-form')?.classList.add('hidden');
}

async function submitOwnerLocationUpdate(event) {
  event.preventDefault();
  const section = document.getElementById('owner-location-section');
  const input = document.getElementById('owner-location-input');
  const button = document.getElementById('owner-location-save-btn');
  const itemId = section?.dataset.itemId;
  const location = input?.value.trim() || '';

  if (!itemId || !location) {
    Toast.error('Location cannot be empty.');
    return;
  }

  const original = button?.textContent || 'Save';
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }

  try {
    await API.items.update(itemId, { location });
    setText('detail-location', location);
    setText('owner-location-display', location);
    closeOwnerLocationEditor();
    Toast.success(`Location updated.${officeLocationNote(location)}`);
  } catch (error) {
    Toast.error(error.message || 'Could not update location.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}

function openFoundReportModal(item) {
  ensureFoundReportModalReady();

  const modal = document.getElementById('found-report-modal');
  const form = document.getElementById('found-report-form');
  const foundDate = document.getElementById('found-date');
  const counter = document.getElementById('found-description-counter');
  if (!modal || !form) return;

  form.reset();
  modal.dataset.itemId = item.id;

  const today = new Date().toISOString().slice(0, 10);
  if (foundDate) {
    foundDate.max = today;
    foundDate.value = today;
  }
  if (counter) counter.textContent = '0 / min 30';

  modal.classList.remove('hidden');
  window.requestAnimationFrame(() => modal.classList.add('open'));
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('found-location')?.focus();
}

function closeFoundReportModal() {
  const modal = document.getElementById('found-report-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => modal.classList.add('hidden'), 180);
}

function ensureFoundReportModalReady() {
  const modal = document.getElementById('found-report-modal');
  const form = document.getElementById('found-report-form');
  const description = document.getElementById('found-description');
  const counter = document.getElementById('found-description-counter');
  if (!modal || !form || modal.dataset.ready) return;

  modal.dataset.ready = 'true';
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeFoundReportModal();
  });
  document.getElementById('found-report-close')?.addEventListener('click', closeFoundReportModal);
  document.getElementById('found-report-cancel')?.addEventListener('click', closeFoundReportModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeFoundReportModal();
    }
  });

  description?.addEventListener('input', () => {
    const count = description.value.trim().length;
    if (counter) counter.textContent = `${count} / min 30`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitFoundReport(modal.dataset.itemId, form, document.getElementById('found-report-submit'));
  });
}

async function submitFoundReport(itemId, form, button) {
  if (!itemId) {
    Toast.error('Missing item id.');
    return;
  }

  const locationFound = document.getElementById('found-location')?.value.trim() || '';
  const foundDate = document.getElementById('found-date')?.value || '';
  const description = document.getElementById('found-description')?.value.trim() || '';
  const availability = document.getElementById('found-availability')?.value.trim() || '';
  const message = document.getElementById('found-message')?.value.trim()
    || 'I may have found this item. Please message me so we can verify it.';

  if (!locationFound || !foundDate || description.length < 30) {
    Toast.error('Complete the required found report details.');
    return;
  }

  const original = button?.textContent || 'Submit Found Report';
  if (button) {
    button.disabled = true;
    button.textContent = 'Submitting...';
  }

  try {
    await API.claims.create({
      item_id: itemId,
      relationship_type: 'found_it',
      proof_text: `Found on ${foundDate}.\n${description}`,
      message,
      preferred_location: locationFound,
      availability,
    });

    form?.reset();
    closeFoundReportModal();
    const claimBtn = document.getElementById('claim-btn');
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.textContent = 'Found Report Sent';
    }
    Toast.success('Found report submitted. The owner has been notified.');
    if (window.refreshNotificationCount) {
      window.refreshNotificationCount();
    }
  } catch (error) {
    Toast.error(error.message || 'Could not submit found report.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}

async function deleteOwnerReport(id) {
  if (!window.confirm('Delete this report? This action cannot be undone.')) return;

  try {
    await API.items.delete(id);
    Toast.success('Report deleted.');
    window.location.href = 'my-dashboard.html';
  } catch (error) {
    Toast.error(error.message || 'Could not delete report.');
  }
}

function imageSrc(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `http://localhost:8000/${String(raw).replace(/^\/+/, '')}`;
}

async function renderSimilar(item) {
  const similarGrid = document.getElementById('similar-grid');
  if (!similarGrid) return;

  try {
    const similar = await API.items.list({ category: item.category?.name, per_page: 4 });
    const items = Array.isArray(similar?.data?.data) ? similar.data.data : [];
    const similarItems = items.filter((entry) => String(entry.id) !== String(item.id)).slice(0, 2);
    similarGrid.innerHTML = similarItems.length
      ? similarItems.map((entry) => `
        <a class="card item-card" style="padding:16px;display:block;text-decoration:none;color:inherit;" href="item-detail.html?id=${encodeURIComponent(entry.id)}">
          <div class="text-xs text-muted">${Utils.escapeHtml((entry.type || 'item').toUpperCase())} - ${Utils.escapeHtml(Utils.itemStatusLabel(entry.status))}</div>
          <h3 style="margin:8px 0 6px;font-size:18px;">${Utils.escapeHtml(entry.title || 'Untitled item')}</h3>
          <span class="btn btn-secondary btn-sm">View Details</span>
        </a>
      `).join('')
      : '<div class="empty-state">No similar reports found.</div>';
  } catch {
    similarGrid.innerHTML = '<div class="empty-state">No similar reports found.</div>';
  }
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || '';
}

function setStatusBadge(id, status) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = Utils.itemStatusLabel(status);
  element.className = `badge ${Utils.itemStatusClass(status)}`;
}

function officeLocationNote(location) {
  return String(location || '').toLowerCase().includes('at the office')
    ? ' Items at the Lost & Found Office can be claimed by contacting the admin.'
    : '';
}

let isEditMode = false;
let currentEditingItem = null;

function renderInlineEdit(item, isOwner) {
  const btn = document.getElementById('inline-edit-btn');
  const form = document.getElementById('inline-edit-form');
  const viewContent = document.getElementById('item-view-content');
  if (!btn || !form || !viewContent) return;

  const status = Utils.normalizeItemStatus(item.status);
  const isEditable = isOwner && (status === 'active' || status === 'awaiting_approval');
  
  if (isEditable) {
    btn.classList.remove('hidden');
    btn.onclick = () => {
      isEditMode = !isEditMode;
      currentEditingItem = item;
      toggleEditMode();
    };
  } else {
    btn.classList.add('hidden');
    isEditMode = false;
    toggleEditMode();
  }

  if (!form.dataset.ready) {
    form.dataset.ready = 'true';
    document.getElementById('edit-cancel-btn').onclick = () => {
      isEditMode = false;
      toggleEditMode();
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      await submitInlineEdit();
    };
  }
}

function toggleEditMode() {
  const form = document.getElementById('inline-edit-form');
  const viewContent = document.getElementById('item-view-content');
  const btn = document.getElementById('inline-edit-btn');
  const item = currentEditingItem;
  
  if (!form || !viewContent || !btn || !item) return;
  
  if (isEditMode) {
    document.getElementById('edit-title').value = item.title || '';
    document.getElementById('edit-description').value = item.description || '';
    document.getElementById('edit-location').value = item.location || '';
    document.getElementById('edit-color').value = item.color || '';
    document.getElementById('edit-brand').value = item.brand_model || '';
    document.getElementById('edit-category').value = item.category_id || (item.category && item.category.id) || '';
    
    form.classList.remove('hidden');
    viewContent.classList.add('hidden');
    btn.textContent = 'Cancel Edit';
  } else {
    form.classList.add('hidden');
    viewContent.classList.remove('hidden');
    btn.textContent = '✏️ Edit Post';
  }
}

async function submitInlineEdit() {
  const item = currentEditingItem;
  if (!item) return;
  
  const button = document.getElementById('edit-save-btn');
  const originalText = button?.textContent || 'Save Changes';
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }
  
  const payload = {
    title: document.getElementById('edit-title').value.trim(),
    description: document.getElementById('edit-description').value.trim(),
    location: document.getElementById('edit-location').value.trim() || null,
    color: document.getElementById('edit-color').value.trim() || null,
    brand_model: document.getElementById('edit-brand').value.trim() || null,
  };
  
  const catVal = document.getElementById('edit-category').value;
  if (catVal) {
    payload.category_id = Number(catVal);
  }
  
  try {
    await API.items.update(item.id, payload);
    Toast.success('Post updated. It will go back for admin review.');
    isEditMode = false;
    initItemDetail();
  } catch (error) {
    Toast.error(error.message || 'Could not update post.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function renderLocationField(item, isOwner) {
  const container = document.getElementById('detail-location');
  if (!container) return;

  const locationText = item.location || '-';
  container.innerHTML = '';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = locationText;
  container.appendChild(textSpan);

  const status = Utils.normalizeItemStatus(item.status);
  const canEdit = isOwner && status !== 'resolved' && status !== 'closed';

  if (!canEdit) {
    container.className = 'meta-val';
    return;
  }

  container.className = 'meta-val inline-edit-container';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost btn-sm inline-edit-btn';
  editBtn.title = 'Edit Location';
  editBtn.textContent = '✏️';

  container.appendChild(editBtn);

  editBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input inline-edit-input';
    input.maxLength = 255;
    input.value = item.location || '';

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'inline-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-ghost btn-sm text-success inline-edit-btn';
    saveBtn.title = 'Save';
    saveBtn.textContent = '✓';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost btn-sm text-danger inline-edit-btn';
    cancelBtn.title = 'Cancel';
    cancelBtn.textContent = '✕';

    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);

    const restore = () => renderLocationField(item, isOwner);

    cancelBtn.onclick = restore;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') restore();
      if (e.key === 'Enter') saveBtn.click();
    });

    saveBtn.onclick = async () => {
      const newLocation = input.value.trim();
      const original = saveBtn.textContent;
      saveBtn.textContent = '...';
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      input.disabled = true;

      try {
        await API.items.update(item.id, { location: newLocation });
        item.location = newLocation;
        Toast.success('Location updated.');
        renderLocationField(item, isOwner);
        const ownerDisplay = document.getElementById('owner-location-display');
        if (ownerDisplay) ownerDisplay.textContent = newLocation || 'Not specified';
      } catch (error) {
        Toast.error(error.message || 'Could not update location.');
        saveBtn.textContent = original;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    };

    container.innerHTML = '';
    container.appendChild(input);
    container.appendChild(actionsDiv);
    input.focus();
  };
}

// ── Scam Report Modal ──────────────────────────────────────────────────────

function openScamReportModal(item) {
  ensureScamReportModalReady(item);
  const modal = document.getElementById('scam-report-modal');
  const form  = document.getElementById('scam-report-form');
  if (!modal || !form) return;

  form.reset();
  const counter = document.getElementById('scam-report-counter');
  if (counter) counter.textContent = '0 / 500';

  modal.dataset.itemId = item.id;
  modal.classList.remove('hidden');
  window.requestAnimationFrame(() => modal.classList.add('open'));
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('scam-report-description')?.focus();
}

function closeScamReportModal() {
  const modal = document.getElementById('scam-report-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => modal.classList.add('hidden'), 180);
}

function ensureScamReportModalReady(item) {
  const modal = document.getElementById('scam-report-modal');
  const form  = document.getElementById('scam-report-form');
  const textarea = document.getElementById('scam-report-description');
  const counter  = document.getElementById('scam-report-counter');
  if (!modal || !form || modal.dataset.ready) return;

  modal.dataset.ready = 'true';

  // Backdrop click
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeScamReportModal();
  });

  document.getElementById('scam-report-close')?.addEventListener('click', closeScamReportModal);
  document.getElementById('scam-report-cancel')?.addEventListener('click', closeScamReportModal);

  // Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeScamReportModal();
    }
  });

  // Character counter
  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    if (counter) counter.textContent = `${len} / 500`;
  });

  // Form submit
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitScamReport(modal.dataset.itemId, form, document.getElementById('scam-report-submit'), item);
  });
}

async function submitScamReport(itemId, form, button, item) {
  if (!itemId) {
    Toast.error('Missing item id.');
    return;
  }

  const description = document.getElementById('scam-report-description')?.value.trim() || '';
  if (description.length < 30) {
    Toast.error('Please describe what happened (at least 30 characters).');
    return;
  }

  const original = button?.textContent || 'Submit Report';
  if (button) {
    button.disabled = true;
    button.textContent = 'Submitting...';
  }

  try {
    await API.scamReports.create({ item_id: Number(itemId), description });

    form?.reset();
    closeScamReportModal();
    Toast.success('Your report has been submitted to the admin.');

    // Persist in localStorage so the link becomes disabled on reload
    const lsKey = `findit_scam_reported_${itemId}`;
    localStorage.setItem(lsKey, '1');

    // Disable all "Report a Problem" buttons on this page
    document.querySelectorAll('.report-problem-link').forEach((btn) => {
      markReportProblemDone(btn);
      btn.removeEventListener('click', () => openScamReportModal(item));
    });
  } catch (error) {
    Toast.error(error.message || 'Could not submit report.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}
