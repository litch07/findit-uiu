document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();
  
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = document.getElementById('login-btn');
      const errBanner = document.getElementById('login-error');
      const errorText = errBanner?.querySelector('.err-text');
      
      if (button) Utils.setButtonLoading(button, true, 'Signing in...');
      if (errBanner) errBanner.classList.remove('err-banner--visible');
      if (errorText) errorText.textContent = '';

      const rememberChecked = document.getElementById('remember')?.checked || false;
      const result = await Auth.login(
        document.getElementById('email')?.value,
        document.getElementById('password')?.value,
        rememberChecked
      );

      if (button) Utils.setButtonLoading(button, false);
      
      if (!result.success) {
        if (errBanner) {
          errBanner.classList.add('err-banner--visible');
          if (errorText) errorText.textContent = result.message;
        }
        return;
      }

      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'home.html';
    });
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'suspended') {
    const errBanner = document.getElementById('login-error');
    if (errBanner) {
      errBanner.classList.add('err-banner--visible');
      const errText = errBanner.querySelector('.err-text');
      if (errText) errText.textContent = 'Your account has been suspended. Please contact UIU administration.';
    }
  }


  loadPublicStats();
});

async function loadPublicStats() {
  try {
    const response = await API.stats.public();
    const stats = response.data || {};
    animateStat('stat-items', Number(stats.total_posts || 0));
    animateStat('stat-resolved', Number(stats.resolved_items || 0));
  } catch {
    animateStat('stat-items', 0);
    animateStat('stat-resolved', 0);
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
