document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();

  const user = Auth.getUser();
  const state = {
    conversations: [],
    filtered: [],
    activeId: Utils.getParam('conversation') || Utils.getParam('id'),
    activeConversation: null,
    relatedCollapsed: false,
    /** @type {File|null} */
    pendingImage: null,
  };

  const elements = {
    shell:         document.querySelector('.messages-shell'),
    list:          document.getElementById('conv-list'),
    search:        document.getElementById('conv-search'),
    empty:         document.getElementById('chat-empty'),
    thread:        document.getElementById('chat-thread'),
    avatar:        document.getElementById('chat-avatar'),
    name:          document.getElementById('chat-name'),
    itemLink:      document.getElementById('chat-item-link'),
    relatedCard:   document.getElementById('related-post-card'),
    relatedToggle: document.getElementById('related-post-toggle'),
    relatedChevron:document.getElementById('related-post-chevron'),
    relatedBody:   document.getElementById('related-post-body'),
    messages:      document.getElementById('messages-area'),
    form:          document.getElementById('message-form'),
    input:         document.getElementById('msg-input'),
    send:          document.getElementById('send-btn'),
    back:          document.getElementById('mobile-back'),
    attachBtn:     document.getElementById('attach-btn'),
    fileInput:     document.getElementById('image-file-input'),
    imagePreview:  document.getElementById('image-preview'),
    previewThumb:  document.getElementById('image-preview-thumb'),
    previewCancel: document.getElementById('image-preview-cancel'),
    lightbox:      document.getElementById('lightbox-overlay'),
    lightboxImg:   document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
  };

  /* ── Helpers ──────────────────────────────────────────── */

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

  function avatarHtml(userObj, cls) {
    const url = userObj?.avatar_url || null;
    if (url) {
      return `<span class="${cls} avatar-frame-cover"><img class="avatar-img-cover avatar-img-cover--round" src="${Utils.escapeHtml(url)}" alt="Avatar"></span>`;
    }
    return `<span class="${cls}">${Utils.escapeHtml(initials(userObj?.name))}</span>`;
  }

  function otherUser(conversation) {
    if (conversation?.other_user) return conversation.other_user;

    const one = typeof conversation?.participant_one === 'object'
      ? conversation.participant_one?.id
      : conversation?.participant_one;
    const two = typeof conversation?.participant_two === 'object'
      ? conversation.participant_two?.id
      : conversation?.participant_two;

    if (Number(one) === Number(user.id)) return conversation.participantTwo || conversation.participant_two_user || {};
    if (Number(two) === Number(user.id)) return conversation.participantOne || conversation.participant_one_user || {};
    return {};
  }

  function itemContext(conversation) {
    const item = conversation?.item;
    if (!item) return 'General conversation';
    return `${item.type === 'found' ? 'Found' : 'Lost'}: ${item.title}`;
  }

  function timeLabel(value) {
    return value ? (Utils.relativeTime ? Utils.relativeTime(value) : Utils.formatDate(value)) : '';
  }

  function fullDate(value) {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function shortTime(value) {
    return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function isConversationClosed(conversation) {
    return Boolean(conversation?.closed_at)
      || Utils.normalizeItemStatus(conversation?.item?.status) === 'resolved';
  }

  /* ── Lightbox ─────────────────────────────────────────── */

  function openLightbox(src) {
    elements.lightboxImg.src = src;
    elements.lightbox.classList.remove('hidden');
    document.body.classList.add('messages-lightbox-open');
  }

  function closeLightbox() {
    elements.lightbox.classList.add('hidden');
    elements.lightboxImg.src = '';
    document.body.classList.remove('messages-lightbox-open');
  }

  elements.lightboxClose.addEventListener('click', closeLightbox);
  elements.lightbox.addEventListener('click', function (event) {
    if (event.target === elements.lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeLightbox();
  });

  /* ── Image-preview in composer ────────────────────────── */

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      elements.previewThumb.src = event.target.result;
      elements.imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    state.pendingImage = file;
    updateSendState();
  }

  function clearImagePreview() {
    state.pendingImage = null;
    elements.previewThumb.src = '';
    elements.imagePreview.classList.add('hidden');
    elements.fileInput.value = '';
    updateSendState();
  }

  elements.attachBtn.addEventListener('click', function () {
    if (!isConversationClosed(state.activeConversation)) {
      elements.fileInput.click();
    }
  });

  elements.fileInput.addEventListener('change', function () {
    const file = elements.fileInput.files[0];
    if (!file) return;

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_BYTES) {
      Toast.error('Image must be smaller than 5 MB.');
      elements.fileInput.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      Toast.error('Only JPEG, PNG, GIF and WebP images are allowed.');
      elements.fileInput.value = '';
      return;
    }

    showImagePreview(file);
  });

  elements.previewCancel.addEventListener('click', clearImagePreview);

  /* ── Conversation list rendering ──────────────────────── */

  function renderConversationList() {
    if (!state.filtered.length) {
      elements.list.innerHTML = '<div class="conversation-empty">No conversations found.</div>';
      return;
    }

    elements.list.innerHTML = state.filtered.map((conversation) => {
      const other  = otherUser(conversation);
      const latest = Array.isArray(conversation.messages) && conversation.messages.length ? conversation.messages[0] : null;
      const unread = Number(conversation.unread_count || 0);
      const closed = isConversationClosed(conversation);

      return `
        <button type="button" class="conversation-item ${String(conversation.id) === String(state.activeId) ? 'active' : ''}" data-conversation-id="${Utils.escapeHtml(conversation.id)}">
          ${avatarHtml(other, 'conversation-avatar')}
          <span class="conversation-main">
            <span class="conversation-name">${Utils.escapeHtml(other.name || 'Unknown user')}</span>
            <span class="conversation-context">${closed ? 'Closed - ' : ''}${Utils.escapeHtml(latest?.body || (latest?.message_image_url ? '📷 Image' : itemContext(conversation)))}</span>
          </span>
          <span class="conversation-side">
            <span class="conversation-time">${Utils.escapeHtml(timeLabel(latest?.created_at || conversation.last_activity))}</span>
            ${unread ? `<span class="unread-count">${unread > 9 ? '9+' : unread}</span>` : ''}
          </span>
        </button>
      `;
    }).join('');
  }

  function applySearch() {
    const term = elements.search.value.trim().toLowerCase();
    state.filtered = state.conversations.filter((conversation) => {
      const other = otherUser(conversation);
      return `${other.name || ''} ${itemContext(conversation)}`.toLowerCase().includes(term);
    });
    renderConversationList();
  }

  function showPlaceholder() {
    elements.empty.classList.remove('hidden');
    elements.thread.classList.add('hidden');
    elements.shell.classList.remove('show-chat');
  }

  /* ── Related post card ────────────────────────────────── */

  function renderRelatedPost(conversation) {
    const item = conversation?.item;
    if (!item) {
      elements.relatedCard?.classList.add('hidden');
      return;
    }

    elements.relatedCard?.classList.remove('hidden');
    elements.relatedCard?.classList.toggle('collapsed', state.relatedCollapsed);
    elements.relatedToggle?.setAttribute('aria-expanded', String(!state.relatedCollapsed));
    if (elements.relatedChevron) elements.relatedChevron.textContent = state.relatedCollapsed ? 'v' : '^';

    elements.relatedBody.innerHTML = `
      <div class="related-post-main">
        <span class="badge badge-${Utils.escapeHtml(item.type === 'found' ? 'found' : 'lost')}">${Utils.escapeHtml(item.type === 'found' ? 'Found' : 'Lost')}</span>
        <div class="related-post-copy">
          <strong>${Utils.escapeHtml(item.title || 'Untitled item')}</strong>
          <span>${Utils.escapeHtml(item.display_id || `#${item.id}`)}</span>
        </div>
      </div>
      <div class="related-post-actions">
        ${Utils.itemStatusBadge(item.status)}
        <a class="btn btn-secondary btn-sm" href="item-detail.html?id=${encodeURIComponent(item.id)}">View Post</a>
      </div>
    `;
  }

  /* ── Message rendering ────────────────────────────────── */

  function renderMessages(messages) {
    let lastDate = '';
    elements.messages.innerHTML = messages.map((message) => {
      const currentDate = String(message.created_at || '').slice(0, 10);
      const separator = currentDate && currentDate !== lastDate
        ? `<div class="date-separator">${Utils.escapeHtml(fullDate(message.created_at))}</div>`
        : '';
      lastDate = currentDate || lastDate;

      const mine      = Number(message.sender_id) === Number(user.id);
      const otherObj  = otherUser(state.activeConversation);
      const senderObj = mine ? user : otherObj;
      const avatarEl  = avatarHtml(senderObj, 'message-avatar');

      const bodyHtml = message.body
        ? `<div class="message-text">${Utils.escapeHtml(message.body)}</div>`
        : '';

      const imageHtml = message.message_image_url
        ? `<a class="message-image-link" href="#" data-lightbox-src="${Utils.escapeHtml(message.message_image_url)}" aria-label="View full image">
             <img class="message-image" src="${Utils.escapeHtml(message.message_image_url)}" alt="Sent image" loading="lazy">
           </a>`
        : '';

      return `
        ${separator}
        <div class="message-row ${mine ? 'mine' : 'other'}">
          ${avatarEl}
          <div class="message-bubble">
            ${bodyHtml}
            ${imageHtml}
            <span class="message-time">${Utils.escapeHtml(shortTime(message.created_at))}</span>
          </div>
        </div>
      `;
    }).join('');

    // Wire up lightbox clicks
    elements.messages.querySelectorAll('[data-lightbox-src]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        openLightbox(link.dataset.lightboxSrc);
      });
    });

    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  /* ── Composer state ───────────────────────────────────── */

  function updateSendState() {
    const closed  = isConversationClosed(state.activeConversation);
    const hasText = Boolean(elements.input.value.trim());
    const hasImg  = Boolean(state.pendingImage);

    elements.send.disabled     = closed || (!hasText && !hasImg);
    elements.input.disabled    = closed;
    elements.attachBtn.disabled = closed;
  }

  function setComposerClosed(closed) {
    elements.form.classList.toggle('composer-closed', closed);
    elements.input.placeholder = closed
      ? 'This conversation is closed because the item was resolved.'
      : 'Write a message…';
    updateSendState();
  }

  /* ── Select conversation ──────────────────────────────── */

  async function selectConversation(id, updateUrl = true) {
    state.activeId = id;
    renderConversationList();

    try {
      elements.empty.classList.add('hidden');
      elements.thread.classList.remove('hidden');
      elements.shell.classList.add('show-chat');
      elements.messages.innerHTML = '<div class="conversation-empty">Loading messages…</div>';

      const response = await API.messages.getMessages(id);
      state.activeConversation = response.data.conversation;
      const other = otherUser(state.activeConversation);
      setComposerClosed(isConversationClosed(state.activeConversation));

      // Update chat header avatar
      if (other?.avatar_url) {
        elements.avatar.innerHTML = `<img class="avatar-img-cover avatar-img-cover--round" src="${Utils.escapeHtml(other.avatar_url)}" alt="Avatar">`;
        elements.avatar.classList.add('avatar-frame-cover');
      } else {
        elements.avatar.textContent    = initials(other.name);
        elements.avatar.classList.remove('avatar-frame-cover');
      }

      elements.name.textContent      = other.name || 'Unknown user';
      elements.itemLink.textContent  = itemContext(state.activeConversation);
      elements.itemLink.href         = state.activeConversation.item_id
        ? `item-detail.html?id=${encodeURIComponent(state.activeConversation.item_id)}`
        : '#';

      renderRelatedPost(state.activeConversation);
      renderMessages(response.data.messages || []);

      const localConversation = state.conversations.find((c) => String(c.id) === String(id));
      if (localConversation) localConversation.unread_count = 0;
      applySearch();

      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        url.searchParams.set('conversation', id);
        history.replaceState(null, '', url.toString());
      }
    } catch (error) {
      Toast.error(error.message || 'Could not load conversation.');
      showPlaceholder();
    }
  }

  /* ── Load conversations ───────────────────────────────── */

  async function loadConversations() {
    elements.list.innerHTML = '<div class="conversation-empty">Loading conversations…</div>';

    try {
      const response = await API.messages.conversations();
      state.conversations = Array.isArray(response.data) ? response.data : [];
      state.filtered      = state.conversations;
      renderConversationList();

      if (!state.conversations.length) {
        showPlaceholder();
        return;
      }

      const initial = state.activeId && state.conversations.some((c) => String(c.id) === String(state.activeId))
        ? state.activeId
        : state.conversations[0].id;
      selectConversation(initial, Boolean(state.activeId));
    } catch (error) {
      elements.list.innerHTML = `<div class="conversation-empty">${Utils.escapeHtml(error.message || 'Could not load conversations.')}</div>`;
      Toast.error(error.message || 'Could not load conversations.');
    }
  }

  /* ── Send message ─────────────────────────────────────── */

  async function sendMessage() {
    if (isConversationClosed(state.activeConversation)) {
      Toast.info('This conversation is closed because the item has been resolved.');
      return;
    }

    const body   = elements.input.value.trim();
    const image  = state.pendingImage;

    if (!body && !image) return;
    if (!state.activeId)   return;

    // Show upload spinner placeholder
    let spinnerRow = null;
    if (image) {
      spinnerRow = document.createElement('div');
      spinnerRow.className = 'message-bubble-uploading';
      spinnerRow.innerHTML = '<div class="spinner-sm"></div><span>Uploading image…</span>';
      elements.messages.appendChild(spinnerRow);
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    // Disable controls while uploading
    elements.send.disabled      = true;
    elements.attachBtn.disabled = true;
    elements.input.disabled     = true;

    // Snapshot & clear composer
    const savedBody  = elements.input.value;
    const savedImage = state.pendingImage;
    elements.input.value        = '';
    syncComposerRows();
    clearImagePreview();

    try {
      let payload;
      if (savedImage) {
        const fd = new FormData();
        if (body) fd.append('body', body);
        fd.append('image', savedImage);
        payload = fd;
      } else {
        payload = { body };
      }

      await API.messages.send(state.activeId, payload);

      // Remove spinner if it exists
      if (spinnerRow) spinnerRow.remove();

      await selectConversation(state.activeId, false);
      await loadConversations();
    } catch (error) {
      // Remove spinner
      if (spinnerRow) spinnerRow.remove();

      // Restore composer to previous state
      elements.input.value = savedBody;
      if (savedImage) showImagePreview(savedImage);

      Toast.error(error.message || 'Could not send message.');
    } finally {
      elements.input.disabled = isConversationClosed(state.activeConversation);
      updateSendState();
    }
  }

  /* ── Event listeners ──────────────────────────────────── */

  elements.list.addEventListener('click', function (event) {
    const item = event.target.closest('[data-conversation-id]');
    if (item) selectConversation(item.dataset.conversationId);
  });

  elements.search.addEventListener('input', applySearch);

  elements.input.addEventListener('input', function () {
    updateSendState();
    syncComposerRows();
  });

  function syncComposerRows() {
    const lineCount = elements.input.value.split('\n').length;
    elements.input.rows = Math.min(Math.max(lineCount, 1), 6);
  }

  elements.input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  elements.form.addEventListener('submit', function (event) {
    event.preventDefault();
    sendMessage();
  });

  elements.relatedToggle?.addEventListener('click', function () {
    state.relatedCollapsed = !state.relatedCollapsed;
    renderRelatedPost(state.activeConversation || {});
  });

  elements.back.addEventListener('click', showPlaceholder);

  /* ── Init ─────────────────────────────────────────────── */
  updateSendState();
  showPlaceholder();
  loadConversations();
});
