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
  };

  const elements = {
    shell: document.querySelector('.messages-shell'),
    list: document.getElementById('conv-list'),
    search: document.getElementById('conv-search'),
    empty: document.getElementById('chat-empty'),
    thread: document.getElementById('chat-thread'),
    avatar: document.getElementById('chat-avatar'),
    name: document.getElementById('chat-name'),
    itemLink: document.getElementById('chat-item-link'),
    relatedCard: document.getElementById('related-post-card'),
    relatedToggle: document.getElementById('related-post-toggle'),
    relatedChevron: document.getElementById('related-post-chevron'),
    relatedBody: document.getElementById('related-post-body'),
    messages: document.getElementById('messages-area'),
    form: document.getElementById('message-form'),
    input: document.getElementById('msg-input'),
    send: document.getElementById('send-btn'),
    back: document.getElementById('mobile-back'),
  };

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

  function renderConversationList() {
    if (!state.filtered.length) {
      elements.list.innerHTML = '<div class="conversation-empty">No conversations found.</div>';
      return;
    }

    elements.list.innerHTML = state.filtered.map((conversation) => {
      const other = otherUser(conversation);
      const latest = Array.isArray(conversation.messages) && conversation.messages.length ? conversation.messages[0] : null;
      const unread = Number(conversation.unread_count || 0);
      const closed = isConversationClosed(conversation);

      return `
        <button type="button" class="conversation-item ${String(conversation.id) === String(state.activeId) ? 'active' : ''}" data-conversation-id="${Utils.escapeHtml(conversation.id)}">
          <span class="conversation-avatar">${Utils.escapeHtml(initials(other.name))}</span>
          <span class="conversation-main">
            <span class="conversation-name">${Utils.escapeHtml(other.name || 'Unknown user')}</span>
            <span class="conversation-context">${closed ? 'Closed - ' : ''}${Utils.escapeHtml(latest?.body || itemContext(conversation))}</span>
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
          <span>${Utils.escapeHtml(item.reference_id || `#${item.id}`)}</span>
        </div>
      </div>
      <div class="related-post-actions">
        ${Utils.itemStatusBadge(item.status)}
        <a class="btn btn-secondary btn-sm" href="item-detail.html?id=${encodeURIComponent(item.id)}">View Post</a>
      </div>
    `;
  }

  function renderMessages(messages) {
    let lastDate = '';
    elements.messages.innerHTML = messages.map((message) => {
      const currentDate = String(message.created_at || '').slice(0, 10);
      const separator = currentDate && currentDate !== lastDate
        ? `<div class="date-separator">${Utils.escapeHtml(fullDate(message.created_at))}</div>`
        : '';
      lastDate = currentDate || lastDate;

      const mine = Number(message.sender_id) === Number(user.id);
      const avatar = mine ? initials(user.name) : initials(otherUser(state.activeConversation).name);

      return `
        ${separator}
        <div class="message-row ${mine ? 'mine' : 'other'}">
          <span class="message-avatar">${Utils.escapeHtml(avatar)}</span>
          <div class="message-bubble">
            <div class="message-text">${Utils.escapeHtml(message.body || '')}</div>
            <span class="message-time">${Utils.escapeHtml(shortTime(message.created_at))}</span>
          </div>
        </div>
      `;
    }).join('');

    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function updateSendState() {
    const closed = isConversationClosed(state.activeConversation);
    elements.send.disabled = closed || !elements.input.value.trim();
    elements.input.disabled = closed;
  }

  function setComposerClosed(closed) {
    elements.form.classList.toggle('composer-closed', closed);
    elements.input.placeholder = closed
      ? 'This conversation is closed because the item was resolved.'
      : 'Write a message...';
    updateSendState();
  }

  async function selectConversation(id, updateUrl = true) {
    state.activeId = id;
    renderConversationList();

    try {
      elements.empty.classList.add('hidden');
      elements.thread.classList.remove('hidden');
      elements.shell.classList.add('show-chat');
      elements.messages.innerHTML = '<div class="conversation-empty">Loading messages...</div>';

      const response = await API.messages.getMessages(id);
      state.activeConversation = response.data.conversation;
      const other = otherUser(state.activeConversation);
      setComposerClosed(isConversationClosed(state.activeConversation));

      elements.avatar.textContent = initials(other.name);
      elements.name.textContent = other.name || 'Unknown user';
      elements.itemLink.textContent = itemContext(state.activeConversation);
      elements.itemLink.href = state.activeConversation.item_id
        ? `item-detail.html?id=${encodeURIComponent(state.activeConversation.item_id)}`
        : '#';
      renderRelatedPost(state.activeConversation);
      renderMessages(response.data.messages || []);

      const localConversation = state.conversations.find((conversation) => String(conversation.id) === String(id));
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

  async function loadConversations() {
    elements.list.innerHTML = '<div class="conversation-empty">Loading conversations...</div>';

    try {
      const response = await API.messages.conversations();
      state.conversations = Array.isArray(response.data) ? response.data : [];
      state.filtered = state.conversations;
      renderConversationList();

      if (!state.conversations.length) {
        showPlaceholder();
        return;
      }

      const initial = state.activeId && state.conversations.some((conversation) => String(conversation.id) === String(state.activeId))
        ? state.activeId
        : state.conversations[0].id;
      selectConversation(initial, Boolean(state.activeId));
    } catch (error) {
      elements.list.innerHTML = `<div class="conversation-empty">${Utils.escapeHtml(error.message || 'Could not load conversations.')}</div>`;
      Toast.error(error.message || 'Could not load conversations.');
    }
  }

  async function sendMessage() {
    const body = elements.input.value.trim();
    if (isConversationClosed(state.activeConversation)) {
      Toast.info('This conversation is closed because the item has been resolved.');
      return;
    }
    if (!body || !state.activeId) return;

    elements.send.disabled = true;
    try {
      await API.messages.send(state.activeId, body);
      elements.input.value = '';
      elements.input.style.height = 'auto';
      await selectConversation(state.activeId, false);
      await loadConversations();
    } catch (error) {
      Toast.error(error.message || 'Could not send message.');
    } finally {
      updateSendState();
    }
  }

  elements.list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-conversation-id]');
    if (item) selectConversation(item.dataset.conversationId);
  });

  elements.search.addEventListener('input', applySearch);
  elements.input.addEventListener('input', () => {
    updateSendState();
    elements.input.style.height = 'auto';
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 128)}px`;
  });
  elements.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
  });
  elements.relatedToggle?.addEventListener('click', () => {
    state.relatedCollapsed = !state.relatedCollapsed;
    renderRelatedPost(state.activeConversation || {});
  });
  elements.back.addEventListener('click', showPlaceholder);

  updateSendState();
  showPlaceholder();
  loadConversations();
});
