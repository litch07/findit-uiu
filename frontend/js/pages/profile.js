document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initProfilePage();
});

async function initProfilePage() {
  const userFromStorage = Auth.getUser();
  let pendingFile = null;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '';
  };
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  };

  // ── Avatar rendering ──────────────────────────────────────────
  function renderProfileAvatar(user, previewSrc) {
    const avatar = document.getElementById('profile-avatar');
    if (!avatar) return;

    const src = previewSrc || user?.avatar_url || null;

    if (src) {
      const img = document.createElement('img');
      img.className = 'profile-avatar-img';
      img.alt = 'Profile photo';
      img.src = src;
      avatar.innerHTML = '';
      avatar.appendChild(img);
      return;
    }

    // Initials fallback
    const name   = user?.name || '';
    const parts  = name.trim().split(/\s+/).filter(Boolean);
    const first  = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || '');
    avatar.textContent = `${first}${second}`.toUpperCase();
  }

  // ── Fill profile fields ───────────────────────────────────────
  function fillProfile(user) {
    renderProfileAvatar(user, null);
    setText('p-name', user.name);
    setText('p-dept', user.department);
    setText('p-student-id', user.student_id);
    setText('p-email', user.email);
    setText('p-dept-info', user.department);
    setText('p-since', user.created_at ? Utils.formatDate(user.created_at) : '');
    setText('v-name', user.name);
    setText('v-id', user.student_id);
    setText('v-email', user.email);
    setText('v-dept', user.department);
    setText('v-phone', user.phone);
    setText('v-bio', user.bio || 'No bio added yet.');
    setValue('e-name', user.name);
    setValue('e-id', user.student_id);
    setValue('e-email', user.email);
    setValue('e-dept', user.department);
    setValue('e-phone', user.phone);
    setValue('e-bio', user.bio);
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = user.name; });
    setText('stat-total-posts',    user.stats?.total_posts    || 0);
    setText('stat-active-posts',   user.stats?.active_posts   || 0);
    setText('stat-resolved-posts', user.stats?.resolved_posts || 0);
    setText('stat-total-claims',   user.stats?.total_claims   || 0);
    setText('stat-accepted-claims',user.stats?.accepted_claims|| 0);
    // Sidebar quick stats
    setText('ps-posts',   user.stats?.total_posts    || 0);
    setText('ps-returned',user.stats?.resolved_posts || 0);
    setText('ps-pending', user.stats?.active_posts   || 0);
  }

  // ── Photo upload controls ─────────────────────────────────────
  const fileInput      = document.getElementById('photo-file-input');
  const changePhotoBtn = document.getElementById('change-photo-btn');
  const savePhotoBtn   = document.getElementById('save-photo-btn');

  if (changePhotoBtn && fileInput) {
    changePhotoBtn.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      pendingFile = file;

      // Immediate preview via FileReader — no upload yet
      const reader = new FileReader();
      reader.onload = (e) => {
        renderProfileAvatar(Auth.getUser(), e.target.result);
        savePhotoBtn?.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  if (savePhotoBtn) {
    savePhotoBtn.addEventListener('click', async () => {
      if (!pendingFile) return;

      const originalText = savePhotoBtn.textContent;
      savePhotoBtn.textContent  = 'Uploading…';
      savePhotoBtn.disabled     = true;

      try {
        const formData = new FormData();
        formData.append('photo', pendingFile);

        const response   = await API.auth.uploadPhoto(formData);
        const avatarUrl  = response?.data?.avatar_url;

        // Persist to localStorage
        const currentUser = Auth.getUser();
        const updatedUser = { ...currentUser, avatar_url: avatarUrl };
        Auth.setUser(updatedUser);

        // Re-render profile avatar with real URL
        renderProfileAvatar(updatedUser, null);

        // Update navbar avatar without reload
        if (window.renderNavbarAvatar) {
          renderNavbarAvatar(updatedUser, Auth.getInitials());
        }

        // Clear pending state
        pendingFile = null;
        fileInput.value = '';
        savePhotoBtn.classList.add('hidden');

        Toast.success(response?.message || 'Profile photo updated');
      } catch (error) {
        Toast.error(error.message || 'Could not upload photo.');
        // Revert preview to last saved avatar
        renderProfileAvatar(Auth.getUser(), null);
        pendingFile = null;
        fileInput.value = '';
        savePhotoBtn.classList.add('hidden');
      } finally {
        savePhotoBtn.textContent = originalText;
        savePhotoBtn.disabled    = false;
      }
    });
  }

  // ── Edit mode for profile info ────────────────────────────────
  try {
    const response = await API.auth.me();
    const user     = response.data || userFromStorage;
    Auth.setUser({ ...userFromStorage, ...user });
    fillProfile(user);

    const viewMode  = document.getElementById('view-mode');
    const editMode  = document.getElementById('edit-mode');
    const editBtn   = document.getElementById('edit-btn');
    const saveBtn   = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const showEdit = (enabled) => {
      viewMode?.classList.toggle('hidden',  enabled);
      editMode?.classList.toggle('hidden',  !enabled);
      editBtn?.classList.toggle('hidden',   enabled);
    };

    editBtn?.addEventListener('click', () => showEdit(true));
    cancelBtn?.addEventListener('click', () => {
      fillProfile(Auth.getUser());
      showEdit(false);
    });

    saveBtn?.addEventListener('click', async () => {
      try {
        saveBtn.textContent = 'Saving…';
        const update = {
          name:  document.getElementById('e-name')?.value,
          phone: document.getElementById('e-phone')?.value,
          bio:   document.getElementById('e-bio')?.value,
        };
        const updateResponse = await API.auth.updateProfile(update);
        const updatedUser    = updateResponse.data || { ...Auth.getUser(), ...update };
        Auth.setUser({ ...Auth.getUser(), ...updatedUser });
        fillProfile(Auth.getUser());
        initNavbar();
        showEdit(false);
        Toast.success('Profile updated.');
      } catch (error) {
        Toast.error(error.message);
      } finally {
        if (saveBtn) saveBtn.textContent = 'Save Changes';
      }
    });
  } catch (error) {
    Toast.error(error.message);
  }
}
