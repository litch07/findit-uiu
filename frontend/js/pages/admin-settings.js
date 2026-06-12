document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');
  if (!requireAdmin()) return;
  initNavbar();
  initAdminSettings();
});

function initAdminSettings() {
  const tabs = document.querySelectorAll('.settings-tab-btn');
  const sections = document.querySelectorAll('.settings-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab');
  if (initialTab) {
    const tabToClick = document.querySelector(`.settings-tab-btn[data-tab="tab-${initialTab}"]`);
    if (tabToClick) {
      tabToClick.click();
    }
  }

  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('current_password').value;
      const newPassword = document.getElementById('new_password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      
      const currentErr = document.getElementById('current_password_error');
      const confirmErr = document.getElementById('confirm_password_error');
      const btn = document.getElementById('save-password-btn');
      
      currentErr.classList.add('hidden');
      confirmErr.classList.add('hidden');
      
      if (newPassword !== confirmPassword) {
        confirmErr.textContent = 'Passwords do not match.';
        confirmErr.classList.remove('hidden');
        return;
      }
      
      try {
        Utils.setButtonLoading(btn, true, 'Updating...');
        await API.auth.updatePassword({ current_password: currentPassword, new_password: newPassword, new_password_confirmation: confirmPassword });
        Toast.success('Password updated successfully.');
        passwordForm.reset();
      } catch (error) {
        if (error.response?.data?.errors?.current_password) {
          currentErr.textContent = error.response.data.errors.current_password[0];
          currentErr.classList.remove('hidden');
        } else {
          Toast.error(error.message || 'Failed to update password.');
        }
      } finally {
        Utils.setButtonLoading(btn, false);
      }
    });
  }

  initModerationDefaults();
}

function initModerationDefaults() {
  const autoCloseInput = document.getElementById('pref-auto-close');
  const requireReasonToggle = document.getElementById('pref-require-reason');

  if (!autoCloseInput || !requireReasonToggle) return;

  const defaultPrefs = {
    autoCloseDays: 90,
    requireReason: false
  };

  let prefs = { ...defaultPrefs };
  try {
    const stored = localStorage.getItem('findit_admin_prefs');
    if (stored) {
      prefs = { ...prefs, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Could not load admin prefs', e);
  }

  autoCloseInput.value = prefs.autoCloseDays;
  requireReasonToggle.checked = prefs.requireReason;

  const savePrefs = () => {
    prefs.autoCloseDays = parseInt(autoCloseInput.value) || 90;
    prefs.requireReason = requireReasonToggle.checked;
    localStorage.setItem('findit_admin_prefs', JSON.stringify(prefs));
    Toast.success('Preferences saved.');
  };

  autoCloseInput.addEventListener('change', savePrefs);
  requireReasonToggle.addEventListener('change', savePrefs);
}
