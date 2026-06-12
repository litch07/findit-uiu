
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');

  // Pre-fill if logged in
  if (window.Auth && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user) {
      if (user.name) nameInput.value = user.name;
      if (user.email) emailInput.value = user.email;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      const data = {
        name: nameInput.value,
        email: emailInput.value,
        subject: document.getElementById('contact-subject').value,
        message: document.getElementById('contact-message').value
      };

      const res = await API.misc.contactAdmin(data);

      if (window.Toast) {
        Toast.success(res.message || 'Your message has been sent. Admin will respond soon.');
      } else {
        alert(res.message || 'Your message has been sent. Admin will respond soon.');
      }
      form.reset();
    } catch (err) {
      if (window.Toast) {
        Toast.error(err.message || 'Failed to send message. Please try again.');
      } else {
        alert(err.message || 'Failed to send message. Please try again.');
      }
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
