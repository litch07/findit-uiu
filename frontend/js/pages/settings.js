document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth Guard
  if (!requireAuth()) return;
  if (Auth.isAdmin()) {
    window.location.replace('admin.html');
    return;
  }

  // 2. Initialize Page
  initTabs();
  initPasswordForm();
  initPreferences();
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  const sections = document.querySelectorAll('.settings-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate all
      tabBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      // Activate clicked
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

function initPasswordForm() {
  const form = document.getElementById('password-form');
  const currentPasswordError = document.getElementById('current_password_error');
  const confirmPasswordError = document.getElementById('confirm_password_error');
  const saveBtn = document.getElementById('save-password-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset errors
    currentPasswordError.textContent = '';
    currentPasswordError.classList.add('hidden');
    confirmPasswordError.textContent = '';
    confirmPasswordError.classList.add('hidden');

    const current_password = document.getElementById('current_password').value;
    const password = document.getElementById('new_password').value;
    const password_confirmation = document.getElementById('confirm_password').value;

    if (password !== password_confirmation) {
      confirmPasswordError.textContent = 'Passwords do not match.';
      confirmPasswordError.classList.remove('hidden');
      return;
    }

    if (password.length < 8) {
      Toast.show('New password must be at least 8 characters.', 'error');
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Updating...';

      await API.auth.updatePassword({
        current_password,
        password,
        password_confirmation
      });

      Toast.show('Password updated. A confirmation email has been sent.', 'success');
      form.reset();

    } catch (error) {
      // apiCall only throws an Error object with the message. 
      // If it contains "password", we assume it's a validation error for the current password or new password.
      if (error.message.toLowerCase().includes('password') || error.message.toLowerCase().includes('match')) {
        currentPasswordError.textContent = error.message;
        currentPasswordError.classList.remove('hidden');
      } else {
        Toast.show(error.message || 'Failed to update password.', 'error');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Update Password';
    }
  });
}

function initPreferences() {
  const defaultPrefs = {
    postApproved: true,
    claimReceived: true,
    claimUpdate: true
  };

  // Load preferences from localStorage or use defaults
  let prefs = defaultPrefs;
  try {
    const storedPrefs = localStorage.getItem('findit_prefs');
    if (storedPrefs) {
      prefs = JSON.parse(storedPrefs);
    }
  } catch (e) {
    console.error('Failed to parse findit_prefs', e);
  }

  const cbPostApproved = document.getElementById('pref-post-approved');
  const cbClaimReceived = document.getElementById('pref-claim-received');
  const cbClaimUpdate = document.getElementById('pref-claim-update');

  // Set initial state
  if (cbPostApproved) cbPostApproved.checked = prefs.postApproved !== false;
  if (cbClaimReceived) cbClaimReceived.checked = prefs.claimReceived !== false;
  if (cbClaimUpdate) cbClaimUpdate.checked = prefs.claimUpdate !== false;

  // Save changes wrapper
  function savePrefs() {
    const updatedPrefs = {
      postApproved: cbPostApproved ? cbPostApproved.checked : true,
      claimReceived: cbClaimReceived ? cbClaimReceived.checked : true,
      claimUpdate: cbClaimUpdate ? cbClaimUpdate.checked : true
    };
    
    try {
      localStorage.setItem('findit_prefs', JSON.stringify(updatedPrefs));
      Toast.show('Preferences updated', 'success');
    } catch (e) {
      Toast.show('Could not save preferences', 'error');
    }
  }

  if (cbPostApproved) cbPostApproved.addEventListener('change', savePrefs);
  if (cbClaimReceived) cbClaimReceived.addEventListener('change', savePrefs);
  if (cbClaimUpdate) cbClaimUpdate.addEventListener('change', savePrefs);
}
