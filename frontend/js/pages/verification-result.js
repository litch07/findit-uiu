document.addEventListener('DOMContentLoaded', () => {
    // Basic init if needed, like remove loader if we add one later
    document.body.classList.add('ready');

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message');
    
    const successState = document.getElementById('success-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (status === 'success') {
        if (successState) successState.classList.remove('hidden');
        if (errorState) errorState.classList.add('hidden');
    } else {
        if (errorState) errorState.classList.remove('hidden');
        if (successState) successState.classList.add('hidden');
        if (message && errorMessage) {
            errorMessage.textContent = decodeURIComponent(message);
        }
    }
});
