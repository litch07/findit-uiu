document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');

  // Redirect authenticated users to their dashboard — the landing page is for guests.
  if (Auth.isLoggedIn()) {
    window.location.replace(Auth.isAdmin() ? 'admin.html' : 'dashboard.html');
    return;
  }

  FindItPage.init('index');
  loadPublicStats();
});

async function loadPublicStats() {
  try {
    const response = await API.stats.public();
    const stats = response.data || {};
    animateStat('stat-items-posted', Number(stats.total_posts || 0));
    animateStat('stat-items-resolved', Number(stats.resolved_items || 0));
    animateStat('stat-active-students', Number(stats.total_users || 0));
  } catch {
    animateStat('stat-items-posted', 0);
    animateStat('stat-items-resolved', 0);
    animateStat('stat-active-students', 0);
  }
}

function animateStat(id, target) {
  const element = document.getElementById(id);
  if (!element) return;

  const safeTarget = Math.max(0, Number.isFinite(target) ? target : 0);
  const duration = 1500;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(safeTarget * eased));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
