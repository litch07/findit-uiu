document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  initNavbar();

  // Show the path that the user tried to reach
  const path = window.location.pathname;
  const pathEl = document.getElementById('tried-path');
  if (pathEl && path && path !== '/') {
    pathEl.textContent = `The page '${path}' could not be found.`;
    pathEl.classList.remove('hidden');
  }

  // "Go to Dashboard" button: dashboard.html if logged in, else index.html
  const dashBtn = document.getElementById('goto-dashboard-btn');
  if (dashBtn) {
    const token = localStorage.getItem('findit_token') || sessionStorage.getItem('findit_token');
    const userRaw = localStorage.getItem('findit_user') || sessionStorage.getItem('findit_user');
    let role = null;
    try { role = JSON.parse(userRaw)?.role; } catch { /* ignore */ }

    if (token) {
      dashBtn.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
    } else {
      dashBtn.href = 'index.html';
    }
    dashBtn.classList.remove('hidden');
  }
});
