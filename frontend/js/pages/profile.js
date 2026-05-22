document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  FindItPage.init('profile');
});
