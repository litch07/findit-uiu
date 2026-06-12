document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('ready');
    if (typeof requirePublic === 'function' && !requirePublic()) return;
    if (typeof initNavbar === 'function') initNavbar();

    const form = document.getElementById('forgot-password-form');
    const formError = document.getElementById('form-error');
    const errText = formError ? formError.querySelector('.err-text') : null;
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    // Sent screen elements
    const forgotWrapper = document.getElementById('forgot-wrapper');
    const sentWrapper = document.getElementById('sent-wrapper');
    const sentEmailDisplay = document.getElementById('sent-email-display');
    const resendBtn = document.getElementById('resend-btn');
    const backToForgotBtn = document.getElementById('back-to-forgot-btn');

    if (!form) return;

    let resendTimer = null;
    let countdownValue = 30;
    let userEmail = '';

    const startResendCountdown = () => {
        if (resendTimer) clearInterval(resendTimer);
        countdownValue = 30;
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.textContent = `⏱️ Resend in ${countdownValue}s`;
        }

        resendTimer = setInterval(() => {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(resendTimer);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = '🔄 Resend Email';
                }
            } else {
                if (resendBtn) {
                    resendBtn.textContent = `⏱️ Resend in ${countdownValue}s`;
                }
            }
        }, 1000);
    };

    const showSentScreen = (email) => {
        userEmail = email;
        if (sentEmailDisplay) sentEmailDisplay.textContent = email;
        if (forgotWrapper) forgotWrapper.classList.add('hidden');
        if (sentWrapper) sentWrapper.classList.remove('hidden');
        startResendCountdown();
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Hide previous messages
        if (formError) formError.classList.add('hidden');
        if (formSuccess) formSuccess.classList.add('hidden');
        
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;

        if (submitBtn) {
            Utils.setButtonLoading(submitBtn, true, 'Sending...');
        }
        
        try {
            await API.apiCall('POST', '/auth/forgot-password', { email });
            
            // Show sent screen
            showSentScreen(email);
            form.reset();
        } catch (error) {
            console.error('Forgot password error:', error);
            if (errText) errText.textContent = error.message || 'Network error occurred. Please try again.';
            if (formError) formError.classList.remove('hidden');
            if (window.Toast) Toast.error(error.message || 'Failed to send reset link.');
        } finally {
            if (submitBtn) {
                Utils.setButtonLoading(submitBtn, false);
            }
        }
    });

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            if (countdownValue > 0 || !userEmail) return;

            if (resendBtn) {
                resendBtn.disabled = true;
                resendBtn.textContent = 'Sending...';
            }

            try {
                await API.apiCall('POST', '/auth/forgot-password', { email: userEmail });
                if (window.Toast) Toast.success('Reset link resent successfully!');
                startResendCountdown();
            } catch (error) {
                console.error('Resend error:', error);
                if (window.Toast) Toast.error(error.message || 'Failed to resend reset link.');
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = '🔄 Resend Email';
                }
            }
        });
    }

    if (backToForgotBtn) {
        backToForgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (resendTimer) clearInterval(resendTimer);
            if (sentWrapper) sentWrapper.classList.add('hidden');
            if (forgotWrapper) forgotWrapper.classList.remove('hidden');
            if (formError) formError.classList.add('hidden');
            if (formSuccess) formSuccess.classList.add('hidden');
        });
    }
});
