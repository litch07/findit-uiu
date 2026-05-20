const Toast = {
  show(message, type = 'info') {
    const container = this.container();
    const toast = document.createElement('div');

    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = [
      'margin:8px',
      'padding:12px 14px',
      'border-radius:8px',
      'background:#111827',
      'color:#fff',
      'box-shadow:0 8px 24px rgba(15,23,42,.18)',
      'font-size:14px',
      'line-height:1.4',
    ].join(';');

    if (type === 'success') toast.style.background = '#047857';
    if (type === 'error') toast.style.background = '#b91c1c';
    if (type === 'warning') toast.style.background = '#b45309';

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  container() {
    let container = document.getElementById('toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;right:16px;top:16px;z-index:9999;max-width:360px;';
    document.body.appendChild(container);
    return container;
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  warning(message) {
    this.show(message, 'warning');
  },

  info(message) {
    this.show(message, 'info');
  },
};

window.Toast = Toast;
