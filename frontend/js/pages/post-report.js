document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  FindItPage.init('post-report');

  // Navigate on clicking anywhere on the cards
  document.querySelectorAll('.report-card').forEach((card) => {
    card.addEventListener('click', function () {
      const href = this.getAttribute('data-href');
      if (href) {
        window.location.href = href;
      }
    });
  });

  // Interactive Close Notice Banner
  const closeBtn = document.getElementById('close-notice-btn');
  const banner = document.getElementById('search-check-banner');
  if (closeBtn && banner) {
    const dismissBanner = () => {
      if (banner.classList.contains('pre-post-notice--dismissed')) return;
      banner.classList.add('pre-post-notice--dismissed');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 450);
    };

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dismissBanner();
    });

    // Auto-dismiss after 8 seconds
    setTimeout(dismissBanner, 8000);
  }
});
