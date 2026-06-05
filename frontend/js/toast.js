/**
 * Toast notification system
 * - Uses CSS classes only (no inline styles)
 * - Adds role="alert" and aria-live="polite" for screen-reader accessibility
 * - Queues concurrent toasts so they don't stack simultaneously
 */

const Toast = (() => {
  const DURATION = 3500;   // ms each toast is visible
  const GAP_MS   = 100;    // brief gap between queued toasts
  const MAX_VISIBLE = 4;   // max toasts shown at once

  let queue = [];           // pending messages
  let visible = 0;          // currently displayed toasts

  /* ── Internals ────────────────────────────────── */

  function getContainer() {
    let container = document.getElementById('toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
    return container;
  }

  function _dismiss(toast) {
    if (toast.dataset.dismissed) return;
    toast.dataset.dismissed = '1';
    toast.classList.add('out');
    visible = Math.max(0, visible - 1);

    const onEnd = () => {
      toast.removeEventListener('animationend', onEnd);
      toast.remove();
      _flushQueue();
    };
    toast.addEventListener('animationend', onEnd);

    // Fallback in case animationend never fires
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        _flushQueue();
      }
    }, 350);
  }

  function _show(message, type) {
    const container = getContainer();
    const toast = document.createElement('div');

    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    // Icon + message layout
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
      <span class="toast-message">${_escape(String(message ?? ''))}</span>
      <button type="button" class="toast-close" aria-label="Dismiss notification">×</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    let timer;

    const dismiss = () => {
      clearTimeout(timer);
      _dismiss(toast);
    };

    closeBtn.addEventListener('click', dismiss);
    timer = setTimeout(dismiss, DURATION);

    container.appendChild(toast);
    visible++;

    // Drain queue after this slot frees
    setTimeout(_flushQueue, DURATION + GAP_MS);
  }

  function _flushQueue() {
    if (queue.length === 0 || visible >= MAX_VISIBLE) return;
    const next = queue.shift();
    _show(next.message, next.type);
  }

  function _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ── Public API ───────────────────────────────── */

  function show(message, type = 'info') {
    if (visible < MAX_VISIBLE) {
      _show(message, type);
    } else {
      queue.push({ message, type });
    }
  }

  return {
    show,
    success(message) { show(message, 'success'); },
    error(message)   { show(message, 'error');   },
    warning(message) { show(message, 'warning'); },
    info(message)    { show(message, 'info');    },
  };
})();

window.Toast = Toast;
