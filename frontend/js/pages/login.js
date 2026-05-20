document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();
  FindItPage.init('login');
});
