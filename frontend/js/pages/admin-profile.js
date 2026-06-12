document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  initNavbar();

  const user = Auth.getUser();
  const viewMode = document.getElementById('view-mode');
  const editMode = document.getElementById('edit-mode');
  
  // Elements
  const avatarDisplay = document.getElementById('profile-avatar');
  const vName = document.getElementById('v-name');
  const vEmail = document.getElementById('v-email');
  const vId = document.getElementById('v-id');
  const vSince = document.getElementById('v-since');

  const eName = document.getElementById('e-name');
  const eEmail = document.getElementById('e-email');
  const eId = document.getElementById('e-id');

  const statApproved = document.getElementById('stat-approved');
  const statRejected = document.getElementById('stat-rejected');
  const statUsers = document.getElementById('stat-users');

  const editBtn = document.getElementById('edit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const profileForm = document.getElementById('profile-form');
  
  // Photo
  const changePhotoBtn = document.getElementById('change-photo-btn');
  const savePhotoBtn = document.getElementById('save-photo-btn');
  const photoFileInput = document.getElementById('photo-file-input');

  let selectedFile = null;

  async function loadProfileData() {
    try {
      const response = await API.auth.me();
      const me = response.data || response;
      
      localStorage.setItem('findit_user', JSON.stringify(me));

      // View
      vName.textContent = me.name || '';
      vEmail.textContent = me.email || '';
      vId.textContent = me.student_id || 'N/A';
      vSince.textContent = Utils.formatDate(me.created_at);

      // Edit
      eName.value = me.name || '';
      eEmail.value = me.email || '';
      eId.value = me.student_id || '';

      // Avatar
      if (me.avatar_url) {
        avatarDisplay.innerHTML = `<img src="${Utils.escapeHtml(me.avatar_url)}" alt="Avatar">`;
      } else {
        avatarDisplay.textContent = Auth.getInitials();
      }

      // Stats
      const statsResponse = await API.admin.stats();
      const adminActivity = statsResponse.data?.admin_activity || {};
      
      statApproved.textContent = adminActivity.items_approved || 0;
      statRejected.textContent = adminActivity.items_rejected || 0;
      statUsers.textContent = adminActivity.users_reviewed || 0;

    } catch (error) {
      Toast.show(error.message || 'Failed to load profile.', 'error');
    }
  }

  // Toggle Edit/View
  editBtn.addEventListener('click', () => {
    viewMode.classList.add('hidden');
    editMode.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    editMode.classList.add('hidden');
    viewMode.classList.remove('hidden');
    eName.value = vName.textContent;
  });

  // Save Profile
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    Utils.setButtonLoading(btn, true);

    try {
      const response = await API.auth.updateProfile({
        name: eName.value.trim()
      });

      const updatedUser = response.data || response;
      localStorage.setItem('findit_user', JSON.stringify(updatedUser));
      
      // Update Navbar
      renderNavbarAvatar(updatedUser, Auth.getInitials());
      document.querySelectorAll('.nav-menu__name, #nav-menu-name').forEach((element) => {
        element.textContent = updatedUser.name || '';
      });
      
      Toast.show('Profile updated.', 'success');
      
      viewMode.classList.remove('hidden');
      editMode.classList.add('hidden');
      
      vName.textContent = updatedUser.name || '';
      
    } catch (error) {
      Toast.show(error.message || 'Failed to update profile.', 'error');
    } finally {
      Utils.setButtonLoading(btn, false);
    }
  });

  // Photo logic
  changePhotoBtn.addEventListener('click', () => {
    photoFileInput.click();
  });

  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      Toast.show('Image must be less than 2MB', 'error');
      return;
    }
    
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarDisplay.innerHTML = `<img src="${e.target.result}" alt="Avatar preview">`;
      changePhotoBtn.classList.add('hidden');
      savePhotoBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  savePhotoBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    Utils.setButtonLoading(savePhotoBtn, true);
    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const response = await API.auth.uploadPhoto(formData);
      const updatedUser = response.data || response;
      localStorage.setItem('findit_user', JSON.stringify(updatedUser));
      
      renderNavbarAvatar(updatedUser, Auth.getInitials());
      
      Toast.show('Profile photo updated', 'success');
      
      changePhotoBtn.classList.remove('hidden');
      savePhotoBtn.classList.add('hidden');
      selectedFile = null;
      photoFileInput.value = '';
    } catch (error) {
      Toast.show(error.message || 'Failed to update photo', 'error');
    } finally {
      Utils.setButtonLoading(savePhotoBtn, false);
    }
  });

  await loadProfileData();
});
