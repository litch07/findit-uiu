let currentAdminItem = null;

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminReportDetail();
});

async function initAdminReportDetail() {
  const id = Utils.getParam('id');
  const main = document.querySelector('main');
  if (!id || !main) {
    Utils.showError(main, 'Missing report id.');
    return;
  }

  main.innerHTML = '<div class="admin-loading">Loading report...</div>';

  try {
    const response = await API.admin.item(id);
    currentAdminItem = response.data;
    renderReportPage(currentAdminItem);
  } catch (error) {
    Utils.showError(main, error.message || 'Could not load report.');
  }
}

function renderReportPage(item) {
  const main = document.querySelector('main');
  if (!main) return;

  const status = Utils.normalizeItemStatus(item.status);

  main.innerHTML = `
    <div class="admin-page-head">
      <div>
        <div class="breadcrumb"><a href="admin.html">Admin</a> / <a href="admin-reports.html">All Reports</a> / <span class="cur">${Utils.escapeHtml(item.reference_id || item.id)}</span></div>
        <h1 class="font-heading m-0 mt-2" style="font-size:34px;">Admin Report Detail</h1>
      </div>
      <a class="btn btn-secondary" href="admin-reports.html">Back to Reports</a>
    </div>

    <div class="admin-report-layout">
      <section class="admin-report-main">
        <div class="card">
          <div class="card-body">
            <div class="admin-report-titlebar">
              <div>
                <h2>${Utils.escapeHtml(item.title || 'Untitled report')}</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                  <span class="badge badge-${Utils.escapeHtml(item.type || 'lost')}">${Utils.escapeHtml(typeLabel(item.type))}</span>
                  ${statusBadge(status, 'detail-status-badge')}
                  <span class="badge-ref">${Utils.escapeHtml(item.reference_id || `#${item.id}`)}</span>
                  <span class="badge ${item.is_approved ? 'badge-success' : 'badge-awaiting-approval'}">${item.is_approved ? 'Approved' : 'Awaiting Approval'}</span>
                </div>
              </div>
            </div>

            <div class="admin-detail-grid">
              ${detailCell('Category', item.category?.name || '-')}
              ${detailCell('Color', item.color || '-')}
              ${detailCell('Location', item.location || '-')}
              ${detailCell(item.type === 'found' ? 'Date Found' : 'Date Lost', Utils.formatDate(item.lost_found_date || item.created_at))}
              ${detailCell('Time', item.lost_found_time || '-')}
              ${detailCell('Brand / Model', item.brand_model || '-')}
            </div>

            <h3 class="admin-subtitle">Description</h3>
            <p class="admin-description">${Utils.escapeHtml(item.description || 'No description provided.')}</p>

            <h3 class="admin-subtitle">Images</h3>
            ${renderImages(item.images || [])}

            <h3 class="admin-subtitle">Timeline</h3>
            <div class="admin-timeline">
              <div><strong>Posted</strong><span>${Utils.escapeHtml(Utils.formatDate(item.created_at) || '-')}</span></div>
              <div><strong>Current status</strong><span id="timeline-status">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></div>
              <div><strong>Last updated</strong><span>${Utils.escapeHtml(Utils.formatDate(item.updated_at) || '-')}</span></div>
            </div>

          </div>
        </div>
      </section>

      <aside class="admin-report-side">
        <div class="card">
          <div class="card-body">
            <h3 class="admin-card-title">Posted By</h3>
            <div style="display:flex; gap:12px; align-items:center;">
              <div class="admin-avatar admin-avatar--large">${initials(item.poster?.name)}</div>
              <div>
                <div class="font-weight-700">${Utils.escapeHtml(item.poster?.name || 'Unknown')}</div>
                <div class="font-mono text-xs text-muted">${Utils.escapeHtml(item.poster?.student_id || '-')}</div>
                <div class="text-sm">${Utils.escapeHtml(item.poster?.email || '-')}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card admin-controls-card">
          <div class="card-body">
            <h3 class="admin-card-title">Admin Controls</h3>
            ${renderStatusSection(item)}
            ${renderApprovalSection(item)}
            ${renderNotesSection(item)}
            ${renderDangerSection()}
          </div>
        </div>
      </aside>
    </div>
  `;

  bindAdminReportControls(item);
}

function renderStatusSection(item) {
  const status = Utils.normalizeItemStatus(item.status);
  return `
    <section class="admin-control-section">
      <h4>Post Status</h4>
      <div class="admin-current-status">
        ${statusBadge(status, 'control-status-badge admin-status-badge--large')}
      </div>
      <label class="form-label" for="admin-status">Change to</label>
      <select class="form-select" id="admin-status">
        ${Utils.itemStatusOptions.map(([value, label]) => `<option value="${value}" ${value === status ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-full mt-3" id="update-status-btn">Update Status</button>
    </section>
  `;
}

function renderApprovalSection(item) {
  if (!item.is_approved) {
    return `
      <section class="admin-control-section">
        <h4>Approval</h4>
        <div class="admin-approval-banner admin-approval-banner--pending">Warning: This post is pending approval</div>
        <button class="btn btn-success btn-full" id="approve-post-btn">Approve Post</button>
        <button class="btn btn-danger-outline btn-full mt-2" id="approval-delete-btn">Delete Post</button>
      </section>
    `;
  }

  return `
    <section class="admin-control-section">
      <h4>Approval</h4>
      <div class="admin-approval-banner admin-approval-banner--approved">Approved</div>
      <button class="btn btn-secondary btn-full" id="revoke-approval-btn">Revoke Approval</button>
    </section>
  `;
}

function renderNotesSection(item) {
  return `
    <section class="admin-control-section">
      <h4>Admin Notes</h4>
      <textarea class="form-textarea" id="admin-note" rows="5" placeholder="Private admin note...">${Utils.escapeHtml(item.admin_note || '')}</textarea>
      <button class="btn btn-secondary btn-full mt-3" id="save-note-btn">Save Note</button>
    </section>
  `;
}

function renderDangerSection() {
  return `
    <section class="admin-control-section admin-control-section--danger">
      <h4>Danger Zone</h4>
      <p class="text-sm text-muted">This permanently removes the post and cannot be undone.</p>
      <button class="btn btn-danger btn-full" id="danger-delete-btn">Permanently Delete Post</button>
    </section>
  `;
}

function bindAdminReportControls(item) {
  document.getElementById('update-status-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('admin-status')?.value;
    await updateItem(item.id, { status }, 'Status updated.');
  });

  document.getElementById('approve-post-btn')?.addEventListener('click', async () => {
    await updateItem(item.id, { is_approved: true }, 'Post approved.');
  });

  document.getElementById('revoke-approval-btn')?.addEventListener('click', async () => {
    await updateItem(item.id, { is_approved: false }, 'Approval revoked.');
  });

  document.getElementById('save-note-btn')?.addEventListener('click', async () => {
    const adminNote = document.getElementById('admin-note')?.value || '';
    await updateItem(item.id, { admin_note: adminNote }, 'Admin note saved.');
  });

  document.getElementById('approval-delete-btn')?.addEventListener('click', async () => {
    if (!window.confirm('Delete this pending post? This action cannot be undone.')) return;
    await deletePost(item.id);
  });

  document.getElementById('danger-delete-btn')?.addEventListener('click', async () => {
    const confirmation = window.prompt('Type DELETE to permanently delete this post.');
    if (confirmation !== 'DELETE') {
      Toast.warning('Delete cancelled.');
      return;
    }
    await deletePost(item.id);
  });

}

async function updateItem(id, payload, message) {
  try {
    const response = await API.admin.updateItem(id, payload);
    currentAdminItem = response.data;
    Toast.success(message);
    renderReportPage(currentAdminItem);
  } catch (error) {
    Toast.error(error.message || 'Could not update post.');
  }
}

async function deletePost(id) {
  try {
    await API.admin.deleteItem(id);
    Toast.success('Post deleted.');
    window.location.href = 'admin-reports.html';
  } catch (error) {
    Toast.error(error.message || 'Could not delete post.');
  }
}

function statusBadge(status, extraClass = '') {
  return `<span class="badge ${Utils.itemStatusClass(status)} ${extraClass}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span>`;
}

function detailCell(label, value) {
  return `
    <div class="admin-detail-cell">
      <span>${Utils.escapeHtml(label)}</span>
      <strong>${Utils.escapeHtml(value || '-')}</strong>
    </div>
  `;
}

function renderImages(images) {
  if (!images.length) {
    return '<div class="empty-state" style="padding:24px;">No images submitted.</div>';
  }

  return `
    <div class="admin-image-grid">
      ${images.map((image) => {
        const src = image.image_url?.startsWith('http')
          ? image.image_url
          : `http://localhost:8000/${image.image_url || image.url || image.path || ''}`;
        return `<img src="${Utils.escapeHtml(src)}" alt="Item image">`;
      }).join('')}
    </div>
  `;
}

function typeLabel(type) {
  return type === 'found' ? 'Found' : 'Lost';
}

function initials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}
