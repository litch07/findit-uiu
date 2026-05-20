document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  initNavbar();
  FindItPage.init('index');
  loadPublicStats();
});

async function loadPublicStats() {
  try {
    let stats = JSON.parse(sessionStorage.getItem('findit_public_stats'));
    if (!stats) {
      const response = await API.stats.public();
      stats = response.data || {};
      sessionStorage.setItem('findit_public_stats', JSON.stringify(stats));
    }
    animateStat('stat-items-posted', Number(stats.total_items || 0));
    animateStat('stat-items-resolved', Number(stats.items_resolved || 0));
    animateStat('stat-active-students', Number(stats.active_users || 0));
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
  const duration = 900;
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
