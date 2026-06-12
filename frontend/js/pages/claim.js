document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requireAuth()) return;
  initNavbar();
  initClaimForm();
});

function initClaimForm() {
  const itemId = Utils.getParam('item_id') || Utils.getParam('id');
  const user = Auth.getUser() || {};
  const form = document.getElementById('claim-form');
  const submit = document.getElementById('c-submit');
  const proof = document.getElementById('c-proof');

  if (document.getElementById('c-name')) document.getElementById('c-name').value = user.name || '';
  document.getElementById('view-item-btn')?.setAttribute('href', `item-detail.html?id=${encodeURIComponent(itemId || '')}`);

  loadClaimItem(itemId);

  proof?.addEventListener('input', () => {
    const count = proof.value.trim().length;
    document.getElementById('proof-counter').textContent = `${count} / min 40`;
    document.getElementById('proof-warn')?.classList.toggle('hidden', count >= 40);
  });

  submit?.addEventListener('click', () => form?.requestSubmit());
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitClaim(itemId, submit);
  });
}

async function loadClaimItem(itemId) {
  if (!itemId) return;

  try {
    const response = await API.items.get(itemId);
    const item = response.data;
    setText('claim-item-type', item.type || 'Item');
    setText('claim-item-title', item.title || 'Item');
    setText('claim-item-loc', item.location || '');
    setText('claim-item-date', Utils.formatDate(item.lost_found_date || item.created_at));
    setText('claim-item-status', Utils.itemStatusLabel(item.status));
  } catch (error) {
    Toast.error(error.message || 'Could not load item context.');
  }
}

async function submitClaim(itemId, button) {
  if (!itemId) {
    Toast.error('Missing item id.');
    return;
  }

  const relationship = document.querySelector('input[name="rel"]:checked')?.value;
  const payload = {
    item_id: itemId,
    relationship_type: relationship,
    proof_text: document.getElementById('c-proof')?.value.trim(),
    message: document.getElementById('c-message')?.value.trim(),
    preferred_location: document.getElementById('c-location')?.value.trim(),
    availability: document.getElementById('c-availability')?.value.trim(),
  };

  if (!relationship) {
    Toast.error('Select your relationship to this item.');
    return;
  }

  if (!document.getElementById('c-terms')?.checked) {
    Toast.error('Confirm the claim terms before submitting.');
    return;
  }

  if (button) {
    Utils.setButtonLoading(button, true, 'Submitting...');
  }

  try {
    const response = await API.claims.create(payload);
    const claim = response.data || {};
    document.getElementById('claim-card')?.classList.add('hidden');
    document.getElementById('success-state')?.classList.remove('hidden');
    setText('claim-ref', claim.id ? `Claim #${claim.id}` : 'Claim submitted');
    const viewItemButton = document.getElementById('view-item-btn');
    if (viewItemButton) {
      viewItemButton.href = `item-detail.html?id=${encodeURIComponent(itemId)}`;
    }
    Toast.success('Claim submitted.');
  } catch (error) {
    Toast.error(error.message || 'Could not submit claim.');
  } finally {
    if (button) {
      Utils.setButtonLoading(button, false);
    }
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || '';
}
