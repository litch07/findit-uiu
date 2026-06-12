document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initPublicProfile();
});

async function initPublicProfile() {
  const userId = Utils.getParam('id');
  const main = document.querySelector('main');
  
  if (!userId || !main) {
    Utils.showError(main, 'Missing user ID.');
    return;
  }

  try {
    const response = await API.users.get(userId);
    const data = response.data;
    renderProfile(data.user);
    renderActiveItems(data.items);
  } catch (error) {
    Utils.showError(main, error.message || 'Could not load user profile.');
  }
}

function renderProfile(user) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  };

  setText('p-name', user.name);
  setText('p-dept', user.department || 'No department');
  setText('p-since', `Joined ${Utils.formatDate(user.created_at)}`);
  
  const roleEl = document.getElementById('p-role');
  if (roleEl) {
    if (user.is_banned) {
      roleEl.textContent = 'Suspended';
      roleEl.className = 'badge badge-danger d-inline-block mt-2';
    } else {
      roleEl.textContent = 'Student';
    }
  }

  setText('v-name', user.name);
  setText('v-id', user.student_id || '-');
  setText('v-dept', user.department || '-');

  const avatar = document.getElementById('profile-avatar');
  if (avatar) {
    if (user.avatar_url) {
      const img = document.createElement('img');
      img.className = 'profile-avatar-img';
      img.src = user.avatar_url;
      img.alt = user.name || 'User Avatar';
      img.onerror = () => { img.style.display = 'none'; };
      avatar.innerHTML = '';
      avatar.appendChild(img);
    } else {
      avatar.innerHTML = `<span class="profile-avatar-initials">${initials(user.name)}</span>`;
    }
  }
}

function initials(name) {
  if (!name) return 'U';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

function renderActiveItems(items) {
  const container = document.getElementById('active-items-list');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-muted">No active reports.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="list-item align-items-center">
      <div class="list-item-main">
        <div class="list-item-title mb-1">
          <a href="item-detail.html?id=${encodeURIComponent(item.id)}" class="hover-underline">
            ${Utils.escapeHtml(item.title)}
          </a>
        </div>
        <div class="list-item-meta text-xs">
          <span class="badge ${Utils.itemStatusClass(item.status)}">${Utils.itemStatusLabel(item.status)}</span>
          <span class="ms-2 text-muted">${Utils.formatDate(item.created_at)}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <a href="item-detail.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary btn-sm">View</a>
      </div>
    </div>
  `).join('');
}
