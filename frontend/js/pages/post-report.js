document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  FindItPage.init('post-report');

  // Interactive Close Notice Banner
  const closeBtn = document.getElementById('close-notice-btn');
  const banner = document.getElementById('search-check-banner');
  if (closeBtn && banner) {
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      banner.style.opacity = '0';
      banner.style.transform = 'scale(0.96) translateY(8px)';
      banner.style.pointerEvents = 'none';
      setTimeout(() => {
        banner.style.display = 'none';
      }, 350);
    });
  }
});
