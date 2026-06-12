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
      banner.classList.add('pre-post-notice--dismissed');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 350);
    });
  }
});
