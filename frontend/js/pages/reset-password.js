document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('ready');
    if (typeof requirePublic === 'function' && !requirePublic()) return;
    if (typeof initNavbar === 'function') initNavbar();

    const form = document.getElementById('reset-password-form');
    const formError = document.getElementById('form-error');
    const errText = formError ? formError.querySelector('.err-text') : null;
    const submitBtn = document.getElementById('submit-btn');
    const invalidLinkError = document.getElementById('invalid-link-error');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (!token || !email) {
        if (invalidLinkError) invalidLinkError.classList.remove('hidden');
        if (form) form.classList.add('hidden');
        return;
    }
    
    const tokenInput = document.getElementById('token');
    const emailInput = document.getElementById('email');
    if (tokenInput) tokenInput.value = token;
    if (emailInput) emailInput.value = email;

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (formError) formError.classList.add('hidden');
        
        const pwdError = document.getElementById('password-error');
        const confError = document.getElementById('confirm-error');
        if (pwdError) pwdError.classList.add('hidden');
        if (confError) confError.classList.add('hidden');
        
        const password = document.getElementById('password').value;
        const passwordConfirmation = document.getElementById('password_confirmation').value;
        
        let hasError = false;
        
        if (password.length < 8) {
            if (pwdError) {
                pwdError.textContent = 'Password must be at least 8 characters.';
                pwdError.classList.remove('hidden');
            }
            hasError = true;
        }
        
        if (password !== passwordConfirmation) {
            if (confError) {
                confError.textContent = 'Passwords do not match.';
                confError.classList.remove('hidden');
            }
            hasError = true;
        }
        
        if (hasError) return;

        if (submitBtn) {
            Utils.setButtonLoading(submitBtn, true, 'Resetting...');
        }
        
        try {
            await API.apiCall('POST', '/auth/reset-password', {
                token: token,
                email: email,
                password: password,
                password_confirmation: passwordConfirmation
            });
            
            if (window.Toast) Toast.success('Password reset successfully! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } catch (error) {
            console.error('Reset password error:', error);
            if (errText) errText.textContent = error.message || 'Network error occurred. Please try again.';
            if (formError) formError.classList.remove('hidden');
            if (window.Toast) Toast.error(error.message || 'Failed to reset password.');
        } finally {
            if (submitBtn) {
                Utils.setButtonLoading(submitBtn, false);
            }
        }
    });
});
