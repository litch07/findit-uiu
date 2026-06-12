document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('ready');
    if (typeof requirePublic === 'function' && !requirePublic()) return;
    if (typeof initNavbar === 'function') initNavbar();

    const form = document.getElementById('reset-password-form');
    const submitBtn = document.getElementById('submit-btn');
    
    const resetFormWrapper = document.getElementById('reset-form-wrapper');
    const successWrapper = document.getElementById('success-wrapper');
    const invalidLinkWrapper = document.getElementById('invalid-link-wrapper');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (!token || !email) {
        if (invalidLinkWrapper) invalidLinkWrapper.classList.remove('hidden');
        if (resetFormWrapper) resetFormWrapper.classList.add('hidden');
        if (window.Toast) Toast.error('Invalid or expired reset link.');
        return;
    }
    
    const tokenInput = document.getElementById('token');
    const emailInput = document.getElementById('email');
    if (tokenInput) tokenInput.value = token;
    if (emailInput) emailInput.value = email;

    if (!form) return;

    const pwdInput = document.getElementById('password');
    const confirmInput = document.getElementById('password_confirmation');
    const matchIcon = document.getElementById('match-icon');

    const ruleLen = document.getElementById('rule-len');
    const ruleUp = document.getElementById('rule-up');
    const ruleNum = document.getElementById('rule-num');
    const ruleSp = document.getElementById('rule-sp');

    const segments = document.querySelectorAll('.pwd-meter .meter-seg');

    function checkFormValidity() {
        if (!pwdInput || !confirmInput || !submitBtn) return;
        const val = pwdInput.value;
        const confirmVal = confirmInput.value;

        const rulesMet = val.length >= 8 &&
                         /[A-Z]/.test(val) &&
                         /[0-9]/.test(val) &&
                         /[^A-Za-z0-9]/.test(val);

        const passwordsMatch = confirmVal && val === confirmVal;

        if (rulesMet && passwordsMatch) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }

    function updateRules() {
        if (!pwdInput) return;
        const val = pwdInput.value;
        const rules = {
            len: val.length >= 8,
            up: /[A-Z]/.test(val),
            num: /[0-9]/.test(val),
            sp: /[^A-Za-z0-9]/.test(val)
        };

        function toggleRule(el, met) {
            if (!el) return;
            const indicator = el.querySelector('span');
            if (met) {
                el.classList.add('met');
                if (indicator) indicator.textContent = '✓';
            } else {
                el.classList.remove('met');
                if (indicator) indicator.textContent = '✗';
            }
        }

        toggleRule(ruleLen, rules.len);
        toggleRule(ruleUp, rules.up);
        toggleRule(ruleNum, rules.num);
        toggleRule(ruleSp, rules.sp);

        const score = Object.values(rules).filter(Boolean).length;

        segments.forEach((seg, idx) => {
            seg.className = 'meter-seg';
            if (idx < score) {
                seg.classList.add(`meter-seg--score-${score}`);
            }
        });

        updateConfirm();
        checkFormValidity();
    }

    function updateConfirm() {
        if (!confirmInput || !matchIcon) return;
        const pwdVal = pwdInput ? pwdInput.value : '';
        const confirmVal = confirmInput.value;

        if (!confirmVal) {
            matchIcon.classList.add('hidden');
            return;
        }

        matchIcon.classList.remove('hidden');
        if (pwdVal === confirmVal) {
            matchIcon.textContent = '✓';
            matchIcon.classList.remove('error');
        } else {
            matchIcon.textContent = '✗';
            matchIcon.classList.add('error');
        }
        checkFormValidity();
    }

    if (pwdInput) {
        pwdInput.addEventListener('input', () => {
            pwdInput.classList.remove('error');
            const pwdError = document.getElementById('password-error');
            if (pwdError) pwdError.classList.add('hidden');
            updateRules();
        });
    }

    if (confirmInput) {
        confirmInput.addEventListener('input', () => {
            confirmInput.classList.remove('error');
            const confError = document.getElementById('confirm-error');
            if (confError) confError.classList.add('hidden');
            updateConfirm();
        });
    }

    checkFormValidity();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pwdError = document.getElementById('password-error');
        const confError = document.getElementById('confirm-error');
        if (pwdError) pwdError.classList.add('hidden');
        if (confError) confError.classList.add('hidden');
        
        const password = pwdInput ? pwdInput.value : '';
        const passwordConfirmation = confirmInput ? confirmInput.value : '';
        
        let hasError = false;
        
        const hasLen = password.length >= 8;
        const hasUp = /[A-Z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        const hasSp = /[^A-Za-z0-9]/.test(password);

        if (!hasLen || !hasUp || !hasNum || !hasSp) {
            if (pwdInput) pwdInput.classList.add('error');
            if (pwdError) {
                pwdError.textContent = 'Password must meet all security requirements.';
                pwdError.classList.remove('hidden');
            }
            hasError = true;
        } else {
            if (pwdInput) pwdInput.classList.remove('error');
        }
        
        if (password !== passwordConfirmation) {
            if (confirmInput) confirmInput.classList.add('error');
            if (confError) {
                confError.textContent = 'Passwords do not match.';
                confError.classList.remove('hidden');
            }
            hasError = true;
        } else {
            if (confirmInput) confirmInput.classList.remove('error');
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
            
            if (window.Toast) Toast.success('Password reset successfully!');
            
            if (resetFormWrapper) resetFormWrapper.classList.add('hidden');
            if (successWrapper) successWrapper.classList.remove('hidden');
            
            let timeLeft = 5;
            const countdownEl = document.getElementById('countdown');
            if (countdownEl) countdownEl.textContent = timeLeft;
            
            const timer = setInterval(() => {
                timeLeft -= 1;
                if (countdownEl) countdownEl.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    window.location.href = 'login.html';
                }
            }, 1000);
        } catch (error) {
            console.error('Reset password error:', error);
            if (window.Toast) {
                Toast.error(error.message || 'Failed to reset password. Please try again.');
            }
        } finally {
            if (submitBtn) {
                Utils.setButtonLoading(submitBtn, false);
            }
        }
    });
});
