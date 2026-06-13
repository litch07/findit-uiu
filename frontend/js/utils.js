const Utils = {
  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  },

  formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  relativeTime(value) {
    if (!value) return '';

    const date = new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (Number.isNaN(seconds)) return '';
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 172800) return 'Yesterday';
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return this.formatDate(value);
  },

  truncate(value, max = 120) {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  
  setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
      }
      button.disabled = true;
      button.style.pointerEvents = 'none';
      button.innerHTML = `<span class="spinner spinner-inline"></span> ${Utils.escapeHtml(loadingText)}`;
    } else {
      button.disabled = false;
      button.style.pointerEvents = '';
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  },

  showInlineError(inputElement, message) {
    if (!inputElement) return;
    inputElement.classList.add('error');
    let err = inputElement.nextElementSibling;
    if (!err || !err.classList.contains('form-error')) {
      err = document.createElement('div');
      err.className = 'form-error';
      inputElement.parentNode.insertBefore(err, inputElement.nextSibling);
    }
    err.textContent = message;
  },

  clearInlineErrors(formElement) {
    if (!formElement) return;
    formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    formElement.querySelectorAll('.form-error').forEach(el => el.remove());
  },

  showConfirmModal(title, text, onConfirm) {
    let modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-confirm-modal';
      modal.className = 'modal-bg';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title" id="confirm-title">Confirm Action</h3>
            <button class="modal__close" id="confirm-close">&times;</button>
          </div>
          <div class="modal__body">
            <p id="confirm-text" class="text-muted"></p>
          </div>
          <div class="modal__footer">
            <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
            <button class="btn btn-danger" id="confirm-ok">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent = text;
    
    const closeBtn = document.getElementById('confirm-close');
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    const close = () => modal.classList.remove('open');
    
    closeBtn.onclick = close;
    cancelBtn.onclick = close;
    okBtn.onclick = () => {
      close();
      if (onConfirm) onConfirm();
    };

    modal.classList.add('open');
  },

  showError(target, message) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
      element.innerHTML = `<div class="empty-state error-state">${this.escapeHtml(message)}</div>`;
    }
    if (window.Toast?.error) Toast.error(message);
  },

  itemStatusLabels: {
    awaiting_approval: '⏳ Awaiting Approval',
    active: '✅ Active',
    claim_in_progress: '🤝 Claim in Progress',
    resolved: '✔️ Resolved',
    closed: '🚫 Closed',
    rejected: '❌ Rejected',
  },

  itemStatusOptions: [
    ['awaiting_approval', '⏳ Awaiting Approval'],
    ['active', '✅ Active'],
    ['claim_in_progress', '🤝 Claim in Progress'],
    ['resolved', '✔️ Resolved'],
    ['closed', '🚫 Closed'],
    ['rejected', '❌ Rejected'],
  ],

  studentItemStatusOptions: [
    ['active', '✅ Active'],
    ['claim_in_progress', '🤝 Claim in Progress'],
    ['resolved', '✔️ Resolved'],
  ],

  normalizeItemStatus(status) {
    const normalized = String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const legacy = {
      pending: 'awaiting_approval',
      claimed: 'claim_in_progress',
      returned: 'resolved',
    };

    return legacy[normalized] || normalized || 'awaiting_approval';
  },

  itemStatusLabel(status) {
    const normalized = this.normalizeItemStatus(status);
    return this.itemStatusLabels[normalized] || normalized.replaceAll('_', ' ');
  },

  itemStatusClass(status, prefix = 'badge') {
    return `${prefix}-${this.normalizeItemStatus(status).replaceAll('_', '-')}`;
  },

  itemStatusBadge(status, extraClass = '') {
    const normalized = this.normalizeItemStatus(status);
    return `<span class="badge ${this.itemStatusClass(normalized)} ${extraClass}">${this.escapeHtml(this.itemStatusLabel(normalized))}</span>`;
  },

  adminItemStatusBadge(item, extraClass = '') {
    if (item?.deleted_at) {
      return `<span class="badge badge-deleted ${extraClass}">🗑️ Deleted</span>`;
    }
    return this.itemStatusBadge(item?.status, extraClass);
  },
};

window.Utils = Utils;

function itemTitle(item) {
  return Utils.escapeHtml(item?.title || 'Untitled item');
}

function itemMeta(item) {
  const type = item?.type ? item.type.toUpperCase() : 'ITEM';
  const status = Utils.itemStatusLabel(item?.status);
  return `${type} - ${Utils.escapeHtml(status)}`;
}

function responseItems(response) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function responseTotal(response) {
  return response?.data?.total ?? responseItems(response).length;
}

function renderItemCard(item) {
  const id = encodeURIComponent(item?.id || '');
  return `
    <a class="card item-card item-card-generated" href="item-detail.html?id=${id}">
      <div class="text-xs text-muted">${itemMeta(item)}</div>
      <h3 class="item-card-generated-h3">${itemTitle(item)}</h3>
      <div class="item-card-id">${Utils.escapeHtml(item?.display_id || item?.id || '')}</div>
      <p class="text-sm text-muted item-card-generated-p">${Utils.escapeHtml(Utils.truncate(item?.description || '', 120))}</p>
      <span class="btn btn-secondary btn-sm">View Details</span>
    </a>
  `;
}

function setLoading(element, text = 'Loading...') {
  if (element) {
    element.innerHTML = `<div class="skeleton skeleton-generated">${Utils.escapeHtml(text)}</div>`;
  }
}

function setEmpty(element, text) {
  if (element) {
    element.innerHTML = `<div class="empty-state empty-state-generated">${Utils.escapeHtml(text)}</div>`;
  }
}

const FindItPage = {
  init(page) {
    const handlers = {
      login: () => this.login(),
      register: () => this.register(),
      browse: () => this.browse(),
      dashboard: () => this.dashboard(),
      'item-detail': () => this.itemDetail(),
      claim: () => this.claim(),
      notifications: () => this.notifications(),
      messages: () => this.messages(),
      profile: () => this.profile(),
      admin: () => this.adminDashboard(),
      'admin-reports': () => this.adminReports(),
      'admin-report-detail': () => this.adminReportDetail(),
      'post-lost': () => this.postReport('lost'),
      'post-found': () => this.postReport('found'),
      'post-report': () => this.postReport(),
    };

    handlers[page]?.();
  },

  hydrateNav() {
    initNavbar();
  },

  login() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = document.getElementById('login-btn');
      const error = document.querySelector('#login-error .err-text');
      Utils.setButtonLoading(button, true, 'Signing in...');
      if (error) error.textContent = '';

      const result = await Auth.login(
        document.getElementById('email')?.value,
        document.getElementById('password')?.value,
      );

      Utils.setButtonLoading(button, false);
      if (!result.success) {
        if (error) error.textContent = result.message;
        return;
      }

      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'home.html';
    });
  },

  register() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      Utils.setButtonLoading(submit, true, 'Creating account...');

      try {
        const data = {
          name: document.getElementById('reg-name')?.value || document.getElementById('name')?.value,
          email: document.getElementById('reg-email')?.value || document.getElementById('email')?.value,
          student_id: document.getElementById('reg-student')?.value || document.getElementById('student_id')?.value,
          department: document.getElementById('reg-dept')?.value || document.getElementById('department')?.value,
          password: document.getElementById('reg-pass')?.value || document.getElementById('password')?.value,
          password_confirmation: document.getElementById('reg-confirm')?.value || document.getElementById('password_confirmation')?.value,
        };
        await API.auth.register(data);
        Toast.success('Account created. Check your email to verify it.');
        window.location.href = 'login.html';
      } catch (error) {
        Toast.error(error.message);
      } finally {
        Utils.setButtonLoading(submit, false);
      }
    });
  },

  async browse() {
    const grid = document.getElementById('results-grid');
    const empty = document.getElementById('empty-state');
    const selected = { type: Utils.getParam('type') || 'all' };

    const syncTypePills = () => {
      document.querySelectorAll('.type-pill[data-type]').forEach((pill) => {
        pill.classList.toggle('active', pill.dataset.type === selected.type);
      });
    };

    const dateValue = (primaryId, fallbackId) => document.getElementById(primaryId)?.value || document.getElementById(fallbackId)?.value || '';
    const loadItems = async () => {
      setLoading(grid, 'Loading items...');
      empty?.classList.add('hidden');

      try {
        const params = {
          q: document.getElementById('search-input')?.value || undefined,
          type: selected.type === 'all' ? undefined : selected.type,
          category: document.getElementById('filter-cat')?.value === 'all' ? undefined : document.getElementById('filter-cat')?.value,
          per_page: 50,
        };
        const response = await API.items.list(params);
        let items = responseItems(response);
        const from = dateValue('top-date-from', 'date-from');
        const to = dateValue('top-date-to', 'date-to');
        if (from) items = items.filter((item) => String(item.lost_found_date || item.created_at || '').slice(0, 10) >= from);
        if (to) items = items.filter((item) => String(item.lost_found_date || item.created_at || '').slice(0, 10) <= to);

        grid.innerHTML = items.length ? items.map(renderItemCard).join('') : '';
        document.getElementById('results-count') && (document.getElementById('results-count').textContent = `${items.length} items found`);
        document.getElementById('results-count-text') && (document.getElementById('results-count-text').textContent = `${items.length} results found`);
        empty?.classList.toggle('hidden', items.length > 0);
      } catch (error) {
        Utils.showError(grid, error.message);
      }
    };

    syncTypePills();
    document.querySelectorAll('.type-pill[data-type]').forEach((pill) => {
      if (pill.dataset.ready) return;
      pill.dataset.ready = 'true';
      pill.addEventListener('click', () => {
        selected.type = pill.dataset.type || 'all';
        syncTypePills();
        loadItems();
      });
    });
      ['filter-cat', 'top-date-from', 'top-date-to', 'date-from', 'date-to'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', loadItems);
    });
    document.getElementById('search-btn')?.addEventListener('click', loadItems);
    document.getElementById('apply-filters-btn')?.addEventListener('click', loadItems);
    document.getElementById('search-input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadItems();
    });
    const clear = () => {
      document.getElementById('search-input') && (document.getElementById('search-input').value = '');
      ['filter-cat'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = 'all';
      });
      ['top-date-from', 'top-date-to', 'date-from', 'date-to'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
      selected.type = 'all';
      syncTypePills();
      loadItems();
    };
    document.getElementById('clear-all')?.addEventListener('click', clear);
    document.getElementById('clear-filters-btn')?.addEventListener('click', clear);

    loadItems();
  },

  async dashboard() {
    const found = document.getElementById('found-grid');
    const lost = document.getElementById('lost-grid');
    setLoading(found, 'Loading found items...');
    setLoading(lost, 'Loading lost items...');
    document.getElementById('greeting-name') && (document.getElementById('greeting-name').textContent = `Welcome, ${Auth.getUser()?.name || 'there'}!`);

    API.auth.me().then(res => {
      const user = res.data;
      if (user && user.stats) {
        Auth.setUser({ ...Auth.getUser(), ...user });
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setVal('dash-stat-posts', user.stats.total_posts || 0);
        setVal('dash-stat-recovered', user.stats.resolved_posts || 0);
        setVal('dash-stat-claims', user.stats.total_claims || 0);
      }
    }).catch(() => {});

    try {
      const response = await API.items.list({ per_page: 24 });
      const items = responseItems(response);
      const foundItems = items.filter((item) => item.type === 'found').slice(0, 3);
      const lostItems = items.filter((item) => item.type === 'lost').slice(0, 3);

      found.innerHTML = foundItems.length ? foundItems.map(renderItemCard).join('') : '';
      lost.innerHTML = lostItems.length ? lostItems.map(renderItemCard).join('') : '';
      if (!foundItems.length) setEmpty(found, 'No found items are available yet.');
      if (!lostItems.length) setEmpty(lost, 'No lost items are available yet.');
    } catch (error) {
      Utils.showError(found, error.message);
      Utils.showError(lost, error.message);
    }
  },

  async itemDetail() {
    const id = Utils.getParam('id');
    const target = document.querySelector('main');
    if (!id) return Utils.showError(target, 'Missing item id.');
    const setText = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value || '';
    };

    try {
      const response = await API.items.get(id);
      const item = response.data;
      const image = item.images?.[0]?.url || item.images?.[0]?.path || '';
      setText('#bc-title', item.title);
      setText('#type-badge', item.type || 'Item');
      setText('#status-badge', Utils.itemStatusLabel(item.status));
      setText('#item-title', item.title);
      setText('#item-ref', item.display_id || item.id);
      setText('#item-views', `${item.view_count || 0} views`);
      setText('#item-desc', item.description || 'No description provided.');
      setText('#detail-category', item.category?.name || '-');
      setText('#detail-location', item.location || '-');
      setText('#detail-date', Utils.formatDate(item.lost_found_date || item.created_at));
      setText('#detail-time', item.lost_found_time || '-');
      setText('#detail-color', item.color || '-');
      setText('#detail-spot', item.specific_spot || '-');
      setText('#poster-name', item.poster?.name || 'Unknown user');
      setText('#poster-dept', item.poster?.department || '');
      setText('#poster-since', item.poster?.created_at ? `Member since ${Utils.formatDate(item.poster.created_at)}` : '');
      setText('#poster-count', item.poster?.student_id || '');
      setText('#poster-avatar', (item.poster?.name || 'User').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase());

      const mainImage = document.getElementById('main-img');
      const noImage = document.getElementById('no-img-icon');
      if (mainImage && noImage) {
        if (image) {
          mainImage.src = image;
          mainImage.alt = item.title || 'Item image';
          mainImage.style.display = '';
          noImage.style.display = 'none';
        } else {
          mainImage.style.display = 'none';
          noImage.style.display = 'block';
        }
      }

      const tags = Array.isArray(item.tags) ? item.tags : [];
      const tagsContainer = document.querySelector('#tags-row .tags-container');
      if (tagsContainer) {
        tagsContainer.innerHTML = tags.length
          ? tags.map((tag) => `<span class="badge">${Utils.escapeHtml(tag.tag || tag.name || tag)}</span>`).join('')
          : '<span class="text-sm text-muted">No tags</span>';
      }

      const claimBtn = document.getElementById('claim-btn');
      if (claimBtn) {
        claimBtn.onclick = () => {
          window.location.href = `claim.html?item_id=${encodeURIComponent(item.id)}`;
        };
      }
      const msgBtn = document.getElementById('msg-btn');
      if (msgBtn) msgBtn.href = `messages.html?user_id=${encodeURIComponent(item.posted_by || '')}&item_id=${encodeURIComponent(item.id)}`;

      const similarGrid = document.getElementById('similar-grid');
      if (similarGrid) {
        const similar = await API.items.list({ category: item.category?.name, per_page: 4 }).catch(() => null);
        const similarItems = responseItems(similar).filter((entry) => entry.id !== item.id).slice(0, 2);
        similarGrid.innerHTML = similarItems.length ? similarItems.map(renderItemCard).join('') : '<div class="empty-state">No similar reports found.</div>';
      }
    } catch (error) {
      Utils.showError(target, error.message);
    }
  },

  async notifications() {
    initNavbar();
    const target = document.getElementById('notif-list') || document.getElementById('notifications-list') || document.querySelector('main');
    const empty = document.getElementById('empty-notifs') || document.getElementById('notif-empty');
    const unreadBadge = document.getElementById('unread-badge');
    setLoading(target, 'Loading notifications...');
    try {
      const response = await API.notifications.list();
      const notifications = Array.isArray(response.data) ? response.data : responseItems(response);
      const unreadCount = response.meta?.unread_count ?? notifications.filter((item) => !item.is_read).length;
      if (unreadBadge) unreadBadge.textContent = unreadCount ? `${unreadCount} unread` : 'All read';

      target.innerHTML = notifications.map((n) => `
        <div class="card notif-card">
          <div class="notif-dot ${n.is_read ? 'notif-dot--read' : 'notif-dot--unread'}"></div>
          <div>
            <strong>${Utils.escapeHtml(n.title || 'Notification')}</strong>
            <p class="text-sm text-muted notif-card-p">${Utils.escapeHtml(n.message || '')}</p>
            <div class="text-xs text-muted time">${Utils.relativeTime(n.created_at)}</div>
          </div>
        </div>
      `).join('');

      if (!notifications.length) {
        target.innerHTML = '';
        empty?.classList.remove('hidden');
      } else {
        empty?.classList.add('hidden');
      }

      const markAll = document.getElementById('mark-all-read');
      if (markAll && !markAll.dataset.ready) {
        markAll.dataset.ready = 'true';
        markAll.addEventListener('click', async () => {
          try {
            await API.notifications.markAllRead();
            Toast.success('Notifications marked as read.');
            this.notifications();
          } catch (error) {
            Toast.error(error.message);
          }
        });
      }
    } catch (error) {
      Utils.showError(target, error.message);
    }
  },

  async messages() {
    const target = document.querySelector('#conversations-list, #messages-list, main');
    setLoading(target, 'Loading conversations...');
    try {
      const response = await API.messages.conversations();
      target.innerHTML = response.data.length
        ? response.data.map((c) => `<a class="card item-card-generated" href="messages.html?id=${encodeURIComponent(c.id)}">${Utils.escapeHtml(c.other_user?.name || 'Conversation')}</a>`).join('')
        : '<div class="empty-state">No conversations yet.</div>';
    } catch (error) {
      Utils.showError(target, error.message);
    }
  },

  conversation() {
    this.messages();
  },

  claim() {
    document.querySelector('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await API.claims.create({
          item_id: Utils.getParam('item_id') || Utils.getParam('id'),
          relationship_type: document.querySelector('[name="relationship_type"]')?.value || 'owner',
          proof_text: document.querySelector('[name="proof_text"]')?.value || document.querySelector('textarea')?.value,
          message: document.querySelector('[name="message"]')?.value || document.querySelector('textarea')?.value,
          preferred_location: document.querySelector('[name="preferred_location"], #c-location')?.value,
          availability: document.querySelector('[name="availability"]')?.value,
        });
        Toast.success('Claim submitted.');
      } catch (error) {
        Toast.error(error.message);
      }
    });
  },

  async profile() {
    const userFromStorage = Auth.getUser();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '';
    };
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.value = value || '';
    };
    const renderProfileAvatar = (user) => {
      const avatar = document.getElementById('profile-avatar');
      if (!avatar) return;

      if (user?.photo_url) {
        avatar.innerHTML = `<img class="profile-avatar-img" src="${Utils.escapeHtml(user.photo_url)}" alt="Profile">`;
        return;
      }

      avatar.textContent = Auth.getInitials();
    };
    const fillProfile = (user) => {
      renderProfileAvatar(user);
      setText('p-name', user.name);
      setText('p-dept', user.department);
      setText('p-student-id', user.student_id);
      setText('p-email', user.email);
      setText('p-dept-info', user.department);
      setText('p-since', user.created_at ? Utils.formatDate(user.created_at) : '');
      setText('v-name', user.name);
      setText('v-id', user.student_id);
      setText('v-email', user.email);
      setText('v-dept', user.department);
      setText('v-phone', user.phone);
      setText('v-bio', user.bio || 'No bio added yet.');
      setValue('e-name', user.name);
      setValue('e-id', user.student_id);
      setValue('e-email', user.email);
      setValue('e-dept', user.department);
      setValue('e-phone', user.phone);
      setValue('e-bio', user.bio);
      document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = user.name; });
      setText('stat-total-posts', user.stats?.total_posts || 0);
      setText('stat-active-posts', user.stats?.active_posts || 0);
      setText('stat-resolved-posts', user.stats?.resolved_posts || 0);
      setText('stat-total-claims', user.stats?.total_claims || 0);
      setText('stat-accepted-claims', user.stats?.accepted_claims || 0);
    };

    try {
      const response = await API.auth.me();
      const user = response.data || userFromStorage;
      Auth.setUser({ ...userFromStorage, ...user });
      fillProfile(user);
      initNavbar();
      const viewMode = document.getElementById('view-mode');
      const editMode = document.getElementById('edit-mode');
      const editBtn = document.getElementById('edit-btn');
      const saveBtn = document.getElementById('save-btn');
      const cancelBtn = document.getElementById('cancel-btn');
      const showEdit = (enabled) => {
        viewMode?.classList.toggle('hidden', enabled);
        editMode?.classList.toggle('hidden', !enabled);
        editBtn?.classList.toggle('hidden', enabled);
        saveBtn?.classList.toggle('hidden', !enabled);
        cancelBtn?.classList.toggle('hidden', !enabled);
      };

      editBtn?.addEventListener('click', () => showEdit(true));
      cancelBtn?.addEventListener('click', () => {
        fillProfile(Auth.getUser());
        showEdit(false);
      });
      saveBtn?.addEventListener('click', async () => {
        try {
          Utils.setButtonLoading(saveBtn, true, 'Saving...');
          const update = {
            name: document.getElementById('e-name')?.value,
            phone: document.getElementById('e-phone')?.value,
            bio: document.getElementById('e-bio')?.value,
          };
          const updateResponse = await API.auth.updateProfile(update);
          const updatedUser = updateResponse.data || { ...Auth.getUser(), ...update };
          Auth.setUser({ ...Auth.getUser(), ...updatedUser });
          fillProfile(Auth.getUser());
          initNavbar();
          showEdit(false);
          Toast.success('Profile updated.');
        } catch (error) {
          Toast.error(error.message);
        } finally {
          Utils.setButtonLoading(saveBtn, false);
        }
      });
    } catch (error) {
      Toast.error(error.message);
    }
  },

  async adminDashboard() {
    try {
      const response = await API.admin.stats();
      const stats = response.data || {};
      const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      };
      setText('sv-total', stats.total_items ?? 0);
      setText('sv-pending', stats.pending_items ?? 0);
      setText('sv-active', stats.items_this_month ?? 0);
      setText('sv-returned', stats.returned_items ?? 0);
      setText('pending-count', stats.pending_items ?? 0);
      setText('donut-total', stats.total_items ?? 0);
      document.getElementById('pending-pulse')?.classList.toggle('hidden', !stats.pending_items);
      Object.entries(response.data).forEach(([key, value]) => {
        const element = document.getElementById(key.replaceAll('_', '-')) || document.querySelector(`[data-stat="${key}"]`);
        if (element) element.textContent = value;
      });
    } catch (error) {
      Toast.error(error.message);
    }
  },

  async adminReports() {
    const target = document.querySelector('#reports-list, #items-list, main');
    setLoading(target, 'Loading reports...');
    try {
      const response = await API.admin.items({ per_page: 15 });
      target.innerHTML = (response.data.data || []).map(renderItemCard).join('') || '<div class="empty-state">No reports found.</div>';
    } catch (error) {
      Utils.showError(target, error.message);
    }
  },

  adminReportDetail() {
    this.itemDetail();
  },

  async myReports() {
    const user = Auth.getUser();
    const fill = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '';
    };
    fill('hdr-avatar', Auth.getInitials());
    fill('hdr-name', user?.name || 'User');
    fill('hdr-email', user?.email || '');
    fill('hdr-id', user?.student_id || user?.role || '');

    const activateTab = (tab) => {
      document.querySelectorAll('.sidebar-nav-item').forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));
      document.querySelectorAll('.tab-pane').forEach((pane) => {
        const active = pane.id === `tab-${tab}`;
        pane.classList.toggle('active', active);
        pane.classList.toggle('hidden', !active);
      });
    };
    document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
      if (item.dataset.ready) return;
      item.dataset.ready = 'true';
      item.addEventListener('click', () => activateTab(item.dataset.tab));
    });
    activateTab('all');

    const renderRows = (tbodyId, emptyId, items, typeColumn = true) => {
      const tbody = document.getElementById(tbodyId);
      const empty = document.getElementById(emptyId);
      if (!tbody) return;
      tbody.innerHTML = items.map((item) => `
        <tr>
          <td><input type="checkbox" class="custom-cb" value="${Utils.escapeHtml(item.id)}"></td>
          <td>${item.type === 'found' ? 'F' : 'L'}</td>
          <td>
            <div class="font-weight-600">${itemTitle(item)}</div>
            <div class="text-xs text-muted">${Utils.escapeHtml(Utils.truncate(item.description || '', 70))}</div>
          </td>
          ${typeColumn ? `<td>${Utils.escapeHtml(item.type || '')}</td>` : ''}
          <td>${Utils.escapeHtml(item.category?.name || item.category || '-')}</td>
          ${typeColumn ? '' : `<td>${Utils.escapeHtml(item.location || '-')}</td>`}
          <td>${Utils.formatDate(item.lost_found_date || item.created_at)}</td>
          <td>${Utils.escapeHtml(Utils.itemStatusLabel(item.status))}</td>
          <td style="text-align:right;"><a class="btn btn-secondary btn-sm" href="item-detail.html?id=${encodeURIComponent(item.id)}">View</a></td>
        </tr>
      `).join('');
      if (!items.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
      } else {
        empty?.classList.add('hidden');
      }
    };

    ['all', 'lost', 'found'].forEach((tab) => {
      const tbody = document.getElementById(`${tab}-tbody`);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding:24px;text-align:center;">Loading ${tab === 'all' ? 'reports' : `${tab} reports`}...</td></tr>`;
    });
    const notifList = document.getElementById('notif-list');
    if (notifList) notifList.innerHTML = '<div class="card" style="padding:16px;">Loading notifications...</div>';

    try {
      const [itemsResult, notificationsResult] = await Promise.allSettled([
        API.items.list({ per_page: 100 }),
        API.notifications.list(),
      ]);

      if (itemsResult.status === 'rejected') throw itemsResult.reason;
      const userId = Auth.getUser()?.id;
      const items = responseItems(itemsResult.value).filter((item) => {
        const ownerId = item.posted_by || item.user_id || item.user?.id || item.poster?.id;
        return !ownerId || ownerId === userId;
      });
      const lostItems = items.filter((item) => item.type === 'lost');
      const foundItems = items.filter((item) => item.type === 'found');

      fill('stat-lost', lostItems.length);
      fill('stat-found', foundItems.length);
      fill('stat-returned', items.filter((item) => Utils.normalizeItemStatus(item.status) === 'resolved').length);
      fill('stat-pending', items.filter((item) => Utils.normalizeItemStatus(item.status) === 'awaiting_approval').length);
      renderRows('all-tbody', 'all-empty', items, true);
      renderRows('lost-tbody', 'lost-empty', lostItems, false);
      renderRows('found-tbody', 'found-empty', foundItems, false);

      const notifications = notificationsResult.status === 'fulfilled'
        ? (Array.isArray(notificationsResult.value.data) ? notificationsResult.value.data : responseItems(notificationsResult.value))
        : [];
      if (notifList) {
        notifList.innerHTML = notifications.map((n) => `
          <div class="card" style="padding:16px;">
            <strong>${Utils.escapeHtml(n.title || 'Notification')}</strong>
            <p class="text-sm text-muted" style="margin:6px 0 0;">${Utils.escapeHtml(n.message || '')}</p>
          </div>
        `).join('');
      }
      if (!notifications.length) document.getElementById('notif-empty')?.classList.remove('hidden');
    } catch (error) {
      ['all', 'lost', 'found'].forEach((tab) => {
        const tbody = document.getElementById(`${tab}-tbody`);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding:24px;text-align:center;">${Utils.escapeHtml(error.message)}</td></tr>`;
      });
      Toast.error(error.message);
    }
  },

  postReport(type = null) {
    document.querySelector('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        await API.items.create({
          type: type || document.querySelector('[name="type"]')?.value || 'lost',
          title: document.querySelector('[name="title"], #title')?.value,
          description: document.querySelector('[name="description"], #description')?.value,
          category_id: document.querySelector('[name="category_id"], #category')?.value || null,
          location: document.querySelector('[name="location"], #location')?.value || null,
          color: document.querySelector('[name="color"], #color')?.value,
          brand_model: document.querySelector('[name="brand_model"], #brand_model')?.value,
          specific_spot: document.querySelector('[name="specific_spot"], #specific_spot')?.value,
          lost_found_date: document.querySelector('[name="lost_found_date"], #date')?.value,
          lost_found_time: document.querySelector('[name="lost_found_time"], #time')?.value || null,
          current_location: document.querySelector('[name="current_location"], #current_location, #last-location')?.value,
          tags: [],
        });
        Toast.success('Report submitted.');
        form.reset();
      } catch (error) {
        Toast.error(error.message);
      }
    });
  },
};

window.FindItPage = FindItPage;
