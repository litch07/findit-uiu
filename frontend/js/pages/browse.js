document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();

  const state = {
    type: Utils.getParam('type') || 'all',
    query: '',
    category: 'all',
    status: 'all',
    from: '',
    to: '',
    sort: 'newest',
    page: 1,
    perPage: 9,
    items: [],
  };

  const elements = {
    search: document.getElementById('search-input'),
    category: document.getElementById('filter-category'),
    status: document.getElementById('filter-status'),
    from: document.getElementById('date-from'),
    to: document.getElementById('date-to'),
    sort: document.getElementById('sort-select'),
    grid: document.getElementById('results-grid'),
    empty: document.getElementById('empty-state'),
    pagination: document.getElementById('pagination'),
    countTop: document.getElementById('results-count'),
    countText: document.getElementById('results-count-text'),
    clear: document.getElementById('clear-filters-btn'),
    emptyClear: document.getElementById('empty-clear-btn'),
  };

  function statusClass(status) {
    return `browse-badge--${Utils.normalizeItemStatus(status).replaceAll('_', '-')}`;
  }

  function typeLabel(type) {
    return type === 'found' ? 'Found' : 'Lost';
  }

  function setLoading() {
    elements.empty.classList.add('hidden');
    elements.pagination.innerHTML = '';
    elements.grid.classList.remove('hidden');
    elements.grid.innerHTML = Array.from({ length: 6 }, () => '<div class="browse-card-skeleton"></div>').join('');
  }

  function getItems(response) {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  function activeFilterCount() {
    return [
      state.type !== 'all',
      state.query,
      state.category !== 'all',
      state.status !== 'all',
      state.from,
      state.to,
    ].filter(Boolean).length;
  }

  function syncControls() {
    document.querySelectorAll('.type-pill[data-type]').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.type === state.type);
    });

    elements.search.value = state.query;
    elements.category.value = state.category;
    elements.status.value = state.status;
    elements.from.value = state.from;
    elements.to.value = state.to;
    elements.sort.value = state.sort;
    elements.clear.classList.toggle('hidden', activeFilterCount() === 0);
  }

  function dateKey(item) {
    return String(item.lost_found_date || item.created_at || '').slice(0, 10);
  }

  function filteredItems() {
    let items = [...state.items];

    if (state.from) {
      items = items.filter((item) => dateKey(item) >= state.from);
    }

    if (state.to) {
      items = items.filter((item) => dateKey(item) <= state.to);
    }

    items.sort((a, b) => {
      const first = new Date(a.lost_found_date || a.created_at || 0).getTime();
      const second = new Date(b.lost_found_date || b.created_at || 0).getTime();
      return state.sort === 'oldest' ? first - second : second - first;
    });

    return items;
  }

  function renderCounts(total) {
    const label = `${total} ${total === 1 ? 'item' : 'items'} found`;
    elements.countTop.textContent = label;
    elements.countText.textContent = label;
  }

  function renderCard(item) {
    const type = item.type || 'lost';
    const status = item.status || 'awaiting_approval';
    const location = item.location || 'Location not specified';
    const date = Utils.formatDate(item.lost_found_date || item.created_at) || '-';

    return `
      <a class="browse-item-card" href="item-detail.html?id=${encodeURIComponent(item.id)}">
        <div class="browse-card-visual" aria-hidden="true">${cardVisual(item)}</div>
        <div>
          <div class="browse-card-top">
            <span class="browse-badge browse-badge--${type === 'found' ? 'found' : 'lost'}">${Utils.escapeHtml(typeLabel(type))}</span>
            <span class="browse-badge ${statusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span>
          </div>
          <h3 class="browse-card-title">${Utils.escapeHtml(item.title || 'Untitled item')}</h3>
          <div class="browse-card-meta">
            <span class="browse-card-location"><span aria-hidden="true">📍</span><span>${Utils.escapeHtml(location)}</span></span>
            <span class="browse-card-date"><span aria-hidden="true">📅</span><span>${Utils.escapeHtml(date)}</span></span>
          </div>
        </div>
        <div class="browse-card-footer">View details</div>
      </a>
    `;
  }

  function cardVisual(item) {
    const src = primaryImageSrc(item);
    if (src) {
      return `<img class="browse-card-image" src="${Utils.escapeHtml(src)}" alt="">`;
    }

    return `<span class="browse-card-placeholder">${categoryIcon(item)}</span>`;
  }

  function primaryImageSrc(item) {
    const image = Array.isArray(item.images) ? item.images[0] : null;
    const raw = image?.image_url || image?.url || image?.path || '';
    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) return raw;
    return `http://localhost:8000/${String(raw).replace(/^\/+/, '')}`;
  }

  function categoryIcon(item) {
    const name = String(item.category?.name || item.category || '').trim().toLowerCase();
    const icons = {
      electronics: '📱',
      clothing: '👕',
      documents: '📄',
      accessories: '🎒',
      'cards & id': '🪪',
      keys: '🔑',
      books: '📚',
    };

    return icons[name] || '📦';
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      elements.pagination.innerHTML = '';
      return;
    }

    const buttons = [];
    buttons.push(`<button class="page-btn" type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>‹</button>`);

    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(`<button class="page-btn ${page === state.page ? 'active' : ''}" type="button" data-page="${page}">${page}</button>`);
    }

    buttons.push(`<button class="page-btn" type="button" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''}>›</button>`);
    elements.pagination.innerHTML = buttons.join('');
  }

  function render() {
    const items = filteredItems();
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > totalPages) state.page = totalPages;

    renderCounts(total);
    elements.clear.classList.toggle('hidden', activeFilterCount() === 0);

    if (!total) {
      elements.grid.innerHTML = '';
      elements.grid.classList.add('hidden');
      elements.empty.classList.remove('hidden');
      elements.pagination.innerHTML = '';
      return;
    }

    const start = (state.page - 1) * state.perPage;
    const pageItems = items.slice(start, start + state.perPage);
    elements.empty.classList.add('hidden');
    elements.grid.classList.remove('hidden');
    elements.grid.innerHTML = pageItems.map(renderCard).join('');
    renderPagination(totalPages);
  }

  async function loadItems() {
    setLoading();
    syncControls();

    try {
      const params = {
        per_page: 100,
        q: state.query || undefined,
        type: state.type === 'all' ? undefined : state.type,
        category: state.category === 'all' ? undefined : state.category,
        status: state.status === 'all' ? undefined : state.status,
      };

      const response = await API.items.list(params);
      state.items = getItems(response);
      render();
    } catch (error) {
      elements.grid.classList.remove('hidden');
      elements.empty.classList.add('hidden');
      elements.pagination.innerHTML = '';
      elements.grid.innerHTML = `
        <div class="browse-empty" style="grid-column:1 / -1;">
          <h3>Could not load items</h3>
          <p>${Utils.escapeHtml(error.message || 'Please try again.')}</p>
          <button class="btn btn-primary" type="button" id="retry-load">Retry</button>
        </div>
      `;
      document.getElementById('retry-load')?.addEventListener('click', loadItems);
      Toast.error(error.message || 'Could not load items.');
    }
  }

  function clearFilters() {
    state.type = 'all';
    state.query = '';
    state.category = 'all';
    state.status = 'all';
    state.from = '';
    state.to = '';
    state.sort = 'newest';
    state.page = 1;
    syncControls();
    loadItems();
  }

  document.querySelectorAll('.type-pill[data-type]').forEach((pill) => {
    pill.addEventListener('click', () => {
      state.type = pill.dataset.type || 'all';
      state.page = 1;
      syncControls();
      loadItems();
    });
  });

  elements.search.addEventListener('input', () => {
    state.query = elements.search.value.trim();
    state.page = 1;
    window.clearTimeout(elements.search.dataset.timer);
    elements.search.dataset.timer = window.setTimeout(loadItems, 250);
  });

  elements.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.clearTimeout(elements.search.dataset.timer);
      loadItems();
    }
  });

  elements.category.addEventListener('change', () => {
    state.category = elements.category.value;
    state.page = 1;
    loadItems();
  });

  elements.status.addEventListener('change', () => {
    state.status = elements.status.value;
    state.page = 1;
    loadItems();
  });

  elements.from.addEventListener('change', () => {
    state.from = elements.from.value;
    state.page = 1;
    render();
  });

  elements.to.addEventListener('change', () => {
    state.to = elements.to.value;
    state.page = 1;
    render();
  });

  elements.sort.addEventListener('change', () => {
    state.sort = elements.sort.value;
    state.page = 1;
    render();
  });

  elements.pagination.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;

    state.page = Number(button.dataset.page);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  elements.clear.addEventListener('click', clearFilters);
  elements.emptyClear.addEventListener('click', clearFilters);

  syncControls();
  loadItems();
});
