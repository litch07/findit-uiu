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

  const titleEl = document.getElementById('item-title');
  if (titleEl) titleEl.textContent = 'Loading Report Details...';

  try {
    const response = await API.admin.item(id);
    currentAdminItem = response.data;
    renderReportPage(currentAdminItem);
  } catch (error) {
    if (titleEl) titleEl.textContent = 'Error Loading Report';
    Utils.showError(main, error.message || 'Could not load report.');
  }
}

function renderReportPage(item) {
  const status = Utils.normalizeItemStatus(item.status);

  // Breadcrumb & Headings
  const bcTitle = document.getElementById('bc-title');
  if (bcTitle) bcTitle.textContent = item.display_id || item.id;
  
  const titleEl = document.getElementById('item-title');
  if (titleEl) titleEl.textContent = item.title || 'Untitled report';
  
  const refEl = document.getElementById('item-ref');
  if (refEl) refEl.textContent = item.display_id || `#${item.id}`;

  const descEl = document.getElementById('item-desc');
  if (descEl) descEl.textContent = item.description || 'No description provided.';

  // Badges
  const typeBadge = document.getElementById('type-badge');
  if (typeBadge) {
    typeBadge.textContent = item.type === 'found' ? 'Found' : 'Lost';
    typeBadge.className = `badge badge-${item.type || 'lost'}`;
  }

  const statusBadgeEl = document.getElementById('status-badge');
  if (statusBadgeEl) {
    statusBadgeEl.outerHTML = statusBadge(item, 'badge');
  }

  // Specifications
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('detail-category', item.category?.name || '-');
  setEl('detail-location', item.location || '-');
  setEl('detail-date', Utils.formatDate(item.lost_found_date || item.created_at));
  setEl('detail-time', item.lost_found_time || '-');
  setEl('detail-color', item.color || '-');
  setEl('detail-brand', item.brand_model || '-');

  // Timeline
  setEl('timeline-posted', Utils.formatDate(item.created_at) || '-');
  setEl('timeline-status', Utils.itemStatusLabel(status));
  setEl('timeline-updated', Utils.formatDate(item.updated_at) || '-');

  // Hero Image
  const mainImg = document.getElementById('main-img');
  const mainImgBg = document.getElementById('main-img-bg');
  const noImgIcon = document.getElementById('no-img-icon');
  
  let primaryImg = null;
  const images = item.images || [];
  if (images.length > 0) {
    primaryImg = images[0].image_url?.startsWith('http') ? images[0].image_url : `http://localhost:8000/${images[0].image_url || images[0].url || images[0].path || ''}`;
  }

  if (primaryImg) {
    mainImg.src = primaryImg;
    mainImg.style.display = 'block';
    mainImgBg.src = primaryImg;
    mainImgBg.style.display = 'block';
    noImgIcon.style.display = 'none';
  } else {
    mainImg.style.display = 'none';
    mainImgBg.style.display = 'none';
    noImgIcon.style.display = 'block';
  }

  // Additional Images
  const adminImagesGrid = document.getElementById('admin-images-grid');
  const imagesContainer = document.getElementById('images-container');
  if (images.length > 1 && adminImagesGrid && imagesContainer) {
    adminImagesGrid.classList.remove('hidden');
    imagesContainer.innerHTML = '';
    for (let i = 1; i < images.length; i++) {
      const src = images[i].image_url?.startsWith('http') ? images[i].image_url : `http://localhost:8000/${images[i].image_url || images[i].url || images[i].path || ''}`;
      const img = document.createElement('img');
      img.src = src;
      img.style.height = '120px';
      img.style.borderRadius = '8px';
      img.style.objectFit = 'cover';
      imagesContainer.appendChild(img);
    }
  } else if (adminImagesGrid) {
    adminImagesGrid.classList.add('hidden');
  }

  // Poster Info
  setEl('poster-name', item.poster?.name || 'Unknown');
  setEl('poster-student-id', item.poster?.student_id || '-');
  setEl('poster-email', item.poster?.email || '-');
  
  const posterAvatar = document.getElementById('poster-avatar');
  if (posterAvatar) {
    if (item.poster?.avatar_url) {
      posterAvatar.innerHTML = `<img src="${Utils.escapeHtml(item.poster.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="Avatar">`;
    } else {
      posterAvatar.textContent = initials(item.poster?.name);
    }
  }

  const viewProfileBtn = document.getElementById('view-profile-btn');
  if (viewProfileBtn) {
    viewProfileBtn.href = `admin-user-detail.html?id=${encodeURIComponent(item.poster?.id || item.posted_by)}`;
  }

  // Approval UI
  const pendingUi = document.getElementById('approval-pending-ui');
  const approvedUi = document.getElementById('approval-approved-ui');
  if (item.is_approved) {
    pendingUi?.classList.add('hidden');
    approvedUi?.classList.remove('hidden');
  } else {
    pendingUi?.classList.remove('hidden');
    approvedUi?.classList.add('hidden');
  }

  // Internal Notes
  const adminNoteEl = document.getElementById('admin-note');
  if (adminNoteEl) {
    adminNoteEl.value = item.admin_note || '';
  }

  bindAdminReportControls(item);
}

function bindAdminReportControls(item) {

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

  const prefs = getAdminPrefs();
  const modal = document.getElementById('confirm-del-modal');
  const reasonContainer = document.getElementById('reject-reason-container');
  const reasonInput = document.getElementById('reject-reason');
  let currentDeleteAction = null;

  document.getElementById('del-close')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('del-cancel')?.addEventListener('click', () => modal.classList.add('hidden'));

  document.getElementById('del-confirm-btn')?.addEventListener('click', async () => {
    if (prefs.requireReason && reasonInput) {
      if (!reasonInput.value.trim()) {
        Toast.error('Rejection reason is required.');
        return;
      }
    }
    modal.classList.add('hidden');
    if (currentDeleteAction) {
      await currentDeleteAction(reasonInput?.value?.trim());
    }
  });

  const showDeleteModal = (actionCallback) => {
    currentDeleteAction = actionCallback;
    if (prefs.requireReason && reasonContainer) {
      reasonContainer.classList.remove('hidden');
      if (reasonInput) reasonInput.value = '';
    } else if (reasonContainer) {
      reasonContainer.classList.add('hidden');
    }
    modal?.classList.remove('hidden');
  };

  document.getElementById('approval-reject-btn')?.addEventListener('click', () => {
    if (!prefs.requireReason) {
      Utils.showConfirmModal('Reject Post', 'Reject this pending post?', () => {
        updateItem(item.id, { status: 'rejected' }, 'Post rejected.');
      });
      return;
    }
    showDeleteModal(async (reason) => {
      await updateItem(item.id, { status: 'rejected', admin_note: reason }, 'Post rejected.');
    });
  });

  document.getElementById('danger-delete-btn')?.addEventListener('click', () => {
    const confirmation = window.prompt('Are you sure you want to delete this report? It will be removed from active listings. Type DELETE to confirm.');
    if (confirmation !== 'DELETE') {
      Toast.warning('Delete cancelled.');
      return;
    }
    
    if (!prefs.requireReason) {
      deletePost(item.id);
      return;
    }
    showDeleteModal(async () => {
      await deletePost(item.id);
    });
  });
}

function getAdminPrefs() {
  try {
    const stored = localStorage.getItem('findit_admin_prefs');
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return { autoCloseDays: 90, requireReason: false };
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

function statusBadge(item, extraClass = '') {
  return Utils.adminItemStatusBadge(item, extraClass);
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

function posterAvatarHtml(poster) {
  if (poster?.avatar_url) {
    return `<div class="admin-avatar admin-avatar--large" style="padding:0;overflow:hidden;"><img src="${Utils.escapeHtml(poster.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Avatar"></div>`;
  }
  return `<div class="admin-avatar admin-avatar--large">${initials(poster?.name)}</div>`;
}
