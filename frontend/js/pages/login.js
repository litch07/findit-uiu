document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();
  
  FindItPage.init('login');

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'suspended') {
    const errBanner = document.getElementById('login-error');
    if (errBanner) {
      errBanner.style.display = 'flex';
      const errText = errBanner.querySelector('.err-text');
      if (errText) errText.textContent = 'Your account has been suspended. Please contact UIU administration.';
    }
  }
});
