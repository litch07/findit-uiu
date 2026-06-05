document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('ready');
    if (typeof requirePublic === 'function' && !requirePublic()) return;
    if (typeof initNavbar === 'function') initNavbar();

    const form = document.getElementById('forgot-password-form');
    const formError = document.getElementById('form-error');
    const errText = formError ? formError.querySelector('.err-text') : null;
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Hide previous messages
        if (formError) formError.classList.add('hidden');
        if (formSuccess) formSuccess.classList.add('hidden');
        
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }
        
        try {
            await API.apiCall('POST', '/auth/forgot-password', { email });
            
            // The API returns success (200) regardless of whether the email exists
            if (formSuccess) formSuccess.classList.remove('hidden');
            form.reset();
        } catch (error) {
            console.error('Forgot password error:', error);
            if (errText) errText.textContent = error.message || 'Network error occurred. Please try again.';
            if (formError) formError.classList.remove('hidden');
            if (window.Toast) Toast.error(error.message || 'Failed to send reset link.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
});
