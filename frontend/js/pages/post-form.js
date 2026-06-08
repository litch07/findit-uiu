function initPostItemForm(reportType) {
  const state = {
    type: reportType,
    step: 1,
    selectedColor: '',
    createdItemId: null,
    imageFiles: [],
    editId: new URLSearchParams(window.location.search).get('edit'),
  };

  const fields = {
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    category: document.getElementById('category'),
    color: document.getElementById('color'),
    customColor: document.getElementById('custom-color'),
    brand: document.getElementById('brand'),
    location: document.getElementById('location'),
    specificSpot: document.getElementById('specific-spot'),
    date: document.getElementById('date'),
    time: document.getElementById('time'),
    tags: document.getElementById('tags'),
    features: document.getElementById('features'),
    confirm: document.getElementById('confirm-checkbox') || document.getElementById('confirm-check'),
  };

  hydrateUserFields();
  setupDescriptionCounter(fields.description);
  setupColorPicker(state, fields);
  setupPhotoUpload(state);
  setupOptionalToggles();
  setupConfirmGate(fields);
  bindStepButtons(state, fields);
  showStep(1);

  if (state.editId) {
    loadEditMode(state, fields);
  }
}

function bindStepButtons(state, fields) {
  document.getElementById('next-1')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!validateStepOne(fields)) return;
    showStep(2);
  });

  document.getElementById('next-2')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!validateStepTwo(fields)) return;
    updateReview(fields);
    showStep(3);
  });

  document.getElementById('prev-2')?.addEventListener('click', (event) => {
    event.preventDefault();
    showStep(1);
  });

  document.getElementById('prev-3')?.addEventListener('click', (event) => {
    event.preventDefault();
    showStep(2);
  });

  document.querySelectorAll('.edit-link[data-step]').forEach((link) => {
    link.addEventListener('click', () => showStep(Number(link.dataset.step || 1)));
  });

  document.getElementById('submit-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    submitReport(state, fields);
  });
}

function setupColorPicker(state, fields) {
  const swatches = Array.from(document.querySelectorAll('.color-swatch[data-color]'));

  swatches.forEach((swatch) => {
    swatch.setAttribute('role', 'button');
    swatch.setAttribute('tabindex', '0');
    swatch.setAttribute('aria-label', `Select ${swatch.dataset.color}`);

    const select = () => selectColor(state, fields, swatch.dataset.color || '');

    swatch.addEventListener('click', select);
    swatch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });

  fields.customColor?.addEventListener('input', () => {
    if (state.selectedColor === 'Other' && fields.color) {
      fields.color.value = fields.customColor.value.trim();
    }
  });
}

function selectColor(state, fields, color) {
  const swatches = Array.from(document.querySelectorAll('.color-swatch[data-color]'));
  swatches.forEach((item) => item.classList.toggle('selected', item.dataset.color === color));
  state.selectedColor = color;

  const isOther = color === 'Other';
  fields.customColor?.classList.toggle('hidden', !isOther);
  if (!isOther && fields.color) fields.color.value = color;
  if (isOther && fields.customColor) {
    fields.customColor.focus();
    fields.color.value = fields.customColor.value.trim();
  }
}

function setupDescriptionCounter(description) {
  const counter = document.getElementById('desc-counter');
  if (!description || !counter) return;

  const sync = () => {
    counter.textContent = `${description.value.length} / ${description.maxLength || 500}`;
  };

  description.addEventListener('input', sync);
  sync();
}

function setupPhotoUpload(state) {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  const grid = document.getElementById('preview-grid');
  if (!zone || !input || !grid) return;

  const addFiles = (files) => {
    const incoming = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    state.imageFiles = [...state.imageFiles, ...incoming].slice(0, 4);
    renderImagePreviews(state);
  };

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    addFiles(input.files);
    input.value = '';
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('dragging');
    addFiles(event.dataTransfer.files);
  });

  grid.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-image]');
    if (!removeButton) return;

    state.imageFiles.splice(Number(removeButton.dataset.removeImage), 1);
    renderImagePreviews(state);
  });
}

function renderImagePreviews(state) {
  const grid = document.getElementById('preview-grid');
  if (!grid) return;

  grid.innerHTML = '';
  grid.classList.toggle('hidden', state.imageFiles.length === 0);

  state.imageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      const preview = document.createElement('div');
      preview.className = 'preview-tile';
      preview.innerHTML = `
        <button class="preview-remove" type="button" data-remove-image="${index}" aria-label="Remove image">x</button>
        <img src="${reader.result}" alt="${Utils.escapeHtml(file.name)}">
        <span>${Utils.escapeHtml(file.name)}</span>
      `;
      grid.appendChild(preview);
    };
    reader.readAsDataURL(file);
  });
}

function setupOptionalToggles() {
  const diffToggle = document.getElementById('diff-location-toggle');
  const diffSection = document.getElementById('diff-location-section');
  diffToggle?.addEventListener('change', () => {
    diffSection?.classList.toggle('hidden', !diffToggle.checked);
  });

  document.querySelectorAll('input[name="now"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const value = document.querySelector('input[name="now"]:checked')?.value || '';
      document.getElementById('office-details')?.classList.toggle('hidden', !value.includes('Office'));
    });
  });
}

function setupConfirmGate(fields) {
  const submitBtn = document.getElementById('submit-btn');
  const confirmCheckbox = fields.confirm;
  if (!confirmCheckbox || !submitBtn) return;

  const sync = () => {
    submitBtn.disabled = !confirmCheckbox.checked;
    submitBtn.style.opacity = confirmCheckbox.checked ? '1' : '0.5';
    submitBtn.style.cursor = confirmCheckbox.checked ? 'pointer' : 'not-allowed';
  };

  confirmCheckbox.addEventListener('change', sync);
  sync();
}

function officeLocationNote() {
  return '';
}

function validateStepOne(fields) {
  clearErrors();
  if (!requireValue(fields.title, 'Enter an item title.')) return false;
  if (!requireValue(fields.description, 'Enter a description.')) return false;
  if (fields.description.value.trim().length < 20) {
    showFieldError(fields.description, 'Description must be at least 20 characters.');
    return false;
  }
  if (!requireValue(fields.category, 'Select a category.')) return false;
  return true;
}

function validateStepTwo(fields) {
  clearErrors();
  if (!requireValue(fields.location, 'Enter a location.')) return false;
  if (!requireValue(fields.date, 'Select a date.')) return false;

  const selected = new Date(`${fields.date.value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected > today) {
    showFieldError(fields.date, 'Date cannot be in the future.');
    return false;
  }

  return true;
}

function requireValue(field, message) {
  if (!field || !field.value.trim()) {
    showFieldError(field, message);
    return false;
  }
  return true;
}

function showFieldError(field, message) {
  if (!field) return;

  field.classList.add('error', 'anim-shake');
  const error = document.createElement('div');
  error.className = 'form-error';
  error.textContent = message;
  const holder = field.closest('.form-group') || field.parentElement;
  holder?.appendChild(error);
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => field.classList.remove('anim-shake'), 500);
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach((error) => error.remove());
  document.querySelectorAll('.error').forEach((field) => field.classList.remove('error'));
}

function showStep(step) {
  [1, 2, 3].forEach((index) => {
    document.getElementById(`step-${index}`)?.classList.toggle('hidden', index !== step);
    const nav = document.getElementById(`step-nav-${index}`);
    const circle = nav?.querySelector('.step__circle');
    nav?.classList.toggle('active', index === step);
    nav?.classList.toggle('done', index < step);
    if (circle) circle.textContent = index < step ? '✓' : String(index);
  });
}

function updateReview(fields) {
  setText('rev-title', fields.title?.value);
  setText('rev-cat', fields.category?.selectedOptions?.[0]?.textContent || '');
  setText('rev-loc', fields.location?.value || 'Not specified');
  setText('rev-date', fields.date?.value ? Utils.formatDate(fields.date.value) : '');
}

async function submitReport(state, fields) {
  clearErrors();

  if (!fields.confirm?.checked) {
    showFieldError(fields.confirm, 'Confirm the report before submitting.');
    return;
  }

  const button = document.getElementById('submit-btn');
  const originalText = button?.textContent || 'Submit Report';
  if (button) {
    button.disabled = true;
    button.textContent = state.editId ? 'Saving...' : 'Submitting...';
  }

  try {
    const payload = buildPayload(state, fields);
    const response = state.editId
      ? await API.items.update(state.editId, payload)
      : await API.items.create(payload);
    const item = response?.data || {};
    state.createdItemId = item.id;

    const locationNote = officeLocationNote(fields.location?.value);
    Toast.success(`${state.editId ? 'Report updated.' : (response?.message || 'Report submitted for admin approval.')}${locationNote}`);
    showSuccessState(item, state.editId);
  } catch (error) {
    Toast.error(error.message || 'Could not submit report.');
  } finally {
    if (button) {
      button.disabled = !fields.confirm?.checked;
      button.textContent = originalText;
    }
  }
}

function buildPayload(state, fields) {
  const data = payloadObject(state.type, fields);

  if (state.imageFiles.length > 0 && !state.editId) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'tags') {
        value.forEach((tag) => formData.append('tags[]', tag));
        return;
      }

      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });
    state.imageFiles.forEach((file) => formData.append('images[]', file));
    return formData;
  }

  return data;
}

function payloadObject(type, fields) {
  const tags = (fields.tags?.value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const foundLocation = document.querySelector('input[name="now"]:checked')?.value || '';
  const currentLocation = type === 'found'
    ? foundLocation
    : (document.getElementById('diff-location-toggle')?.checked ? document.getElementById('last-location')?.value : '');

  return {
    type,
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    category_id: fields.category.value ? Number(fields.category.value) : null,
    color: fields.color?.value?.trim() || null,
    brand_model: fields.brand?.value?.trim() || null,
    location: fields.location?.value?.trim() || null,
    specific_spot: fields.specificSpot?.value?.trim() || null,
    lost_found_date: fields.date.value,
    lost_found_time: fields.time?.value || null,
    current_location: currentLocation || null,
    tags,
  };
}

async function loadEditMode(state, fields) {
  try {
    const result = await API.items.get(state.editId);
    const item = result?.data;
    if (!item) return;

    state.type = item.type || state.type;
    document.title = 'Edit Report - FindIt UIU';
    setText('post-mode-label', 'EDIT REPORT');
    setText('post-page-heading', 'Edit Your Report');
    setText('post-page-subtitle', 'Update the details below and save your changes.');
    setText('submit-btn', 'Save Changes');

    const formCard = document.getElementById('form-card');
    if (formCard) formCard.dataset.editId = state.editId;

    fields.title.value = item.title || '';
    fields.description.value = item.description || '';
    fields.category.value = item.category_id || item.category?.id || '';
    fields.color.value = item.color || '';
    fields.brand.value = item.brand_model || '';
    fields.location.value = item.location || '';
    fields.specificSpot.value = item.specific_spot || '';
    fields.date.value = String(item.lost_found_date || '').slice(0, 10);
    fields.time.value = item.lost_found_time ? String(item.lost_found_time).slice(0, 5) : '';
    if (fields.tags) {
      fields.tags.value = Array.isArray(item.tags)
        ? item.tags.map((tag) => tag.tag || tag.name || tag).filter(Boolean).join(', ')
        : '';
    }

    if (item.color) {
      const exact = document.querySelector(`.color-swatch[data-color="${CSS.escape(item.color)}"]`);
      if (exact) {
        selectColor(state, fields, item.color);
      } else {
        selectColor(state, fields, 'Other');
        fields.customColor.value = item.color;
        fields.color.value = item.color;
      }
    }

    if (state.type === 'found' && item.current_location) {
      const radio = Array.from(document.querySelectorAll('input[name="now"]')).find((input) => input.value === item.current_location);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }

    fields.description.dispatchEvent(new Event('input'));
    updateReview(fields);
  } catch (error) {
    Toast.error(error.message || 'Could not load report for editing.');
  }
}

function showSuccessState(item, isEdit) {
  document.querySelector('.post-header')?.classList.add('hidden');
  document.querySelector('.stepper')?.classList.add('hidden');
  document.getElementById('form-card')?.classList.add('hidden');
  const success = document.getElementById('success-state');
  success?.classList.remove('hidden');
  success?.classList.add('post-success-panel');

  setText('success-title', isEdit ? 'Report Updated' : 'Report Submitted');
  setText('success-heading', isEdit ? 'Your changes have been saved' : 'Your report is awaiting approval');
  setText(
    'success-message',
    isEdit
      ? `Your report details were updated successfully.${officeLocationNote(item.location)}`
      : `Our admin team will review your report shortly. You'll receive a notification once it's approved and visible to other students.${officeLocationNote(item.location)}`
  );
  setText('success-ref', item.display_id ? `Report ID: ${item.display_id}` : `Report ID: #${item.id || ''}`);

  const reportsButton = document.getElementById('view-report-btn');
  if (reportsButton) {
    reportsButton.textContent = 'View My Reports';
    reportsButton.onclick = () => {
      window.location.href = 'my-dashboard.html';
    };
  }

  const anotherButton = document.getElementById('submit-another-btn');
  if (anotherButton) {
    anotherButton.textContent = 'Submit Another Report';
    anotherButton.onclick = () => {
      window.location.href = 'post-report.html';
    };
  }
}

function hydrateUserFields() {
  const user = Auth.getUser() || {};
  const name = document.getElementById('contact-name');
  const email = document.getElementById('contact-email');
  if (name) name.value = user.name || '';
  if (email) email.value = user.email || '';
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || '';
}

window.initPostItemForm = initPostItemForm;
