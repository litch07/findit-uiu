/* frontend/js/pages/admin-user-detail.js */
document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminUserDetail();
});

async function initAdminUserDetail() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');

  if (!userId) {
    Toast.error('No user ID provided.');
    return;
  }

  const elements = {
    avatar: document.getElementById('ud-avatar'),
    name: document.getElementById('ud-name'),
    studentId: document.getElementById('ud-student-id'),
    email: document.getElementById('ud-email'),
    statusBadge: document.getElementById('ud-status-badge'),
    verifiedBadge: document.getElementById('ud-verified-badge'),
    joined: document.getElementById('ud-joined'),
    breadcrumbName: document.getElementById('breadcrumb-user-name'),
    
    statTotal: document.getElementById('ud-stat-total'),
    statActive: document.getElementById('ud-stat-active'),
    statResolved: document.getElementById('ud-stat-resolved'),
    statClaims: document.getElementById('ud-stat-claims'),
    banActionContainer: document.getElementById('ud-ban-action-container'),
    
    tbody: document.getElementById('user-posts-tbody'),
    empty: document.getElementById('posts-empty')
  };

  try {
    const response = await window.API.admin.user(userId);
    const user = response.data;
    
    elements.breadcrumbName.textContent = user.name || 'Unknown User';
    
    // Avatar
    const nameParts = (user.name || '').trim().split(/\s+/);
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0]?.[0] || '👤').toUpperCase();
    elements.avatar.textContent = initials;
    
    // Profile
    elements.name.textContent = user.name || 'Unknown User';
    elements.studentId.textContent = user.student_id || '-';
    elements.email.textContent = user.email || '-';
    
    // Badges
    const isBanned = user.is_banned === true;
    elements.statusBadge.innerHTML = isBanned 
      ? '<span class="badge badge-danger">Suspended</span>' 
      : '<span class="badge badge-success">Active</span>';
      
    elements.verifiedBadge.innerHTML = user.email_verified_at 
      ? '<span class="badge badge-success">Verified</span>' 
      : '<span class="badge badge-danger">Unverified</span>';
      
    elements.joined.textContent = Utils.formatDate(user.created_at);
    
    // Action button
    if (elements.banActionContainer && user.role !== 'admin') {
      elements.banActionContainer.classList.remove('hidden');
      elements.banActionContainer.innerHTML = isBanned
        ? `<button class="btn btn-success btn-full" id="btn-unban">Reinstate Account</button>`
        : `<button class="btn btn-danger btn-full" id="btn-ban">Suspend Account</button>`;
        
      const btnBan = document.getElementById('btn-ban');
      const btnUnban = document.getElementById('btn-unban');
      
      if (btnBan) {
        btnBan.addEventListener('click', () => handleBanToggle(userId, user.name, 'ban'));
      }
      if (btnUnban) {
        btnUnban.addEventListener('click', () => handleBanToggle(userId, user.name, 'unban'));
      }
    } else if (elements.banActionContainer) {
      elements.banActionContainer.classList.add('hidden');
    }
    
    // Stats calculation
    const items = user.items || [];
    const claims = user.claims || [];
    
    const activeItems = items.filter(i => i.status === 'active').length;
    const resolvedItems = items.filter(i => i.status === 'resolved').length;
    
    elements.statTotal.textContent = items.length;
    elements.statActive.textContent = activeItems;
    elements.statResolved.textContent = resolvedItems;
    elements.statClaims.textContent = claims.length;
    
    // Table rendering
    if (items.length > 0) {
      elements.tbody.innerHTML = items.map(item => {
        const status = item.status || 'awaiting_approval';
        const type = item.type || 'lost';
        return `
          <tr>
            <td class="font-mono">${Utils.escapeHtml(item.display_id || item.id)}</td>
            <td><span class="badge badge-${Utils.escapeHtml(type)}">${Utils.escapeHtml(type)}</span></td>
            <td>${Utils.escapeHtml(item.title || '-')}</td>
            <td>${Utils.escapeHtml(Utils.formatDate(item.created_at) || '-')}</td>
            <td><span class="badge ${Utils.itemStatusClass(status)}">${Utils.escapeHtml(Utils.itemStatusLabel(status))}</span></td>
            <td><a class="btn btn-secondary btn-sm" href="admin-report-detail.html?id=${encodeURIComponent(item.id)}">View</a></td>
          </tr>
        `;
      }).join('');
      elements.empty.classList.add('hidden');
    } else {
      elements.tbody.innerHTML = '';
      elements.empty.classList.remove('hidden');
    }

  } catch (error) {
    console.error(error);
    Toast.error(error.message || 'Failed to load user details.');
  }
}

async function handleBanToggle(userId, userName, action) {
  const isBan = action === 'ban';
  const actionText = isBan ? 'suspend' : 'reinstate';
  if (!confirm(`Are you sure you want to ${actionText} ${userName || 'this user'}? This action takes effect immediately.`)) {
    return;
  }
  
  try {
    const btn = isBan ? document.getElementById('btn-ban') : document.getElementById('btn-unban');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processing...';
    }
    
    if (isBan) {
      await API.admin.banUser(userId);
      Toast.success('User suspended.');
    } else {
      await API.admin.unbanUser(userId);
      Toast.success('User reinstated.');
    }
    
    // Reload user details silently without full page refresh to update badge and button
    initAdminUserDetail();
  } catch (error) {
    Toast.error(error.message || `Failed to ${actionText} user.`);
    initAdminUserDetail();
  }
}
