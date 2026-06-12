document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');

  // If the user is already logged in, the navbar will render their avatar.
  if (typeof initNavbar === 'function') {
    initNavbar();
  }
});