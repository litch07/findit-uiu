document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initDashboard();
});

async function initDashboard() {
  setGreeting();

  await Promise.all([
    loadStats(),
    loadOwnGrid(document.getElementById('own-grid')),
    loadItemGrid('found', document.getElementById('found-grid')),
    loadItemGrid('lost', document.getElementById('lost-grid')),
  ]);
}

function setGreeting() {
  const user = Auth.getUser();
  const firstName = (user?.name || 'there').trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const target = document.getElementById('greeting-name');

  if (target) {
    target.textContent = `${greeting}, ${firstName}`;
  }
}

async function loadStats() {
  try {
    const [itemsResponse, claimsResponse] = await Promise.all([
      API.items.mine({ per_page: 100 }),
      API.claims.list().catch(() => ({ data: [] })),
    ]);

    const items = responseItems(itemsResponse);
    const claims = Array.isArray(claimsResponse?.data) ? claimsResponse.data : [];
    const userId = String(Auth.getUser()?.id || '');

    setStat('stat-my-reports', items.length);
    setStat('stat-pending', items.filter((item) => Utils.normalizeItemStatus(item.status) === 'awaiting_approval').length);
    setStat('stat-returned', items.filter((item) => Utils.normalizeItemStatus(item.status) === 'resolved').length);
    setStat('stat-active-claims', claims.filter((claim) => {
      return String(claim.claimer_id) === userId && normalize(claim.status) === 'pending';
    }).length);
  } catch (error) {
    Toast.error(error.message || 'Could not load dashboard stats.');
    ['stat-my-reports', 'stat-pending', 'stat-returned', 'stat-active-claims'].forEach((id) => setStat(id, 0));
  }
}

async function loadItemGrid(type, grid) {
  if (!grid) return;

  setGridLoading(grid);

  try {
    const response = await API.items.list({ type, per_page: 6 });
    const items = responseItems(response);

    if (!items.length) {
      grid.innerHTML = `<div class="empty-state">No recent ${Utils.escapeHtml(type)} items are available yet.</div>`;
      return;
    }

    grid.innerHTML = items.map(renderDashboardCard).join('');
  } catch (error) {
    grid.innerHTML = `<div class="error-state">${Utils.escapeHtml(error.message || 'Could not load items.')}</div>`;
    Toast.error(error.message || 'Could not load dashboard items.');
  }
}

async function loadOwnGrid(grid) {
  if (!grid) return;

  setGridLoading(grid);

  try {
    const response = await API.items.mine({ per_page: 6 });
    const items = responseItems(response);

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state">You have not posted any reports yet.</div>';
      return;
    }

    grid.innerHTML = items.map((item) => renderDashboardCard(item, { showApproval: true })).join('');
  } catch (error) {
    grid.innerHTML = `<div class="error-state">${Utils.escapeHtml(error.message || 'Could not load your posts.')}</div>`;
    Toast.error(error.message || 'Could not load your recent posts.');
  }
}

function responseItems(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function renderDashboardCard(item, options = {}) {
  const type = normalize(item.type) || 'item';
  const status = item.status || 'awaiting_approval';
  const date = item.lost_found_date || item.created_at;
  const approvalBadge = options.showApproval && !item.is_approved
    ? '<span class="dashboard-card__approval">Awaiting approval</span>'
    : '';

  return `
    <a class="dashboard-card" href="item-detail.html?id=${encodeURIComponent(item.id)}">
      <div class="dashboard-card__visual" aria-hidden="true">${cardVisual(item)}${approvalBadge}</div>
      <div class="dashboard-card__top">
        <span class="type-badge type-badge--${Utils.escapeHtml(type)}">${Utils.escapeHtml(type)}</span>
        <span class="status-badge status-badge--${Utils.escapeHtml(Utils.normalizeItemStatus(status).replaceAll('_', '-'))}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span>
      </div>
      <h3 class="dashboard-card__title">${Utils.escapeHtml(item.title || 'Untitled item')}</h3>
      <div class="dashboard-card__meta">
        <span>${Utils.escapeHtml(item.location || 'Location not specified')}</span>
        <span>${Utils.escapeHtml(Utils.formatDate(date))}</span>
      </div>
    </a>
  `;
}

function cardVisual(item) {
  const src = primaryImageSrc(item);
  if (src) {
    return `<img class="dashboard-card__image" src="${Utils.escapeHtml(src)}" alt="">`;
  }

  return categoryIcon(item);
}

function primaryImageSrc(item) {
  const image = Array.isArray(item.images) ? item.images[0] : null;
  const raw = image?.image_url || image?.url || image?.path || '';
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  return `http://localhost:8000/${String(raw).replace(/^\/+/, '')}`;
}

function categoryIcon(item) {
  const name = normalize(item.category?.name || item.category || '');
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

function setGridLoading(grid) {
  grid.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

function setStat(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = String(value);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}
