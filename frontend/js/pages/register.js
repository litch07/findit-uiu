document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();
  initRegisterPage();
});

function initRegisterPage() {
  const form = document.querySelector('form');
  const regBtn = document.getElementById('reg-btn');
  const pwdInput = document.getElementById('reg-pass');
  const confirmInput = document.getElementById('reg-confirm');
  const termsCheckbox = document.getElementById('terms');

  if (regBtn) regBtn.disabled = true;

  function checkFormState() {
    if (!regBtn) return;
    const passwordsMatch = pwdInput && confirmInput && pwdInput.value === confirmInput.value && pwdInput.value !== '';
    const termsAccepted = termsCheckbox && termsCheckbox.checked;
    regBtn.disabled = !(passwordsMatch && termsAccepted);
  }

  pwdInput?.addEventListener('input', checkFormState);
  confirmInput?.addEventListener('input', checkFormState);
  termsCheckbox?.addEventListener('change', checkFormState);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (regBtn && regBtn.disabled) return;
    await submitRegistration(form);
  });

  initPasswordValidation();
}

async function submitRegistration(form) {
  const button = document.getElementById('reg-btn') || form.querySelector('[type="submit"]');
  const payload = registrationPayload();

  if (!payload.name || !payload.email || !payload.password || !payload.student_id) {
    Toast.error('Complete the required registration fields.');
    return;
  }

  const password = payload.password;
  const hasLen = password.length >= 8;
  const hasUp = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSp = /[^A-Za-z0-9]/.test(password);

  if (!hasLen || !hasUp || !hasNum || !hasSp) {
    Toast.error('Password must meet all security requirements (8+ characters, uppercase letter, number, and special character).');
    return;
  }

  if (payload.password !== payload.password_confirmation) {
    Toast.error('Passwords do not match.');
    return;
  }
  if (!document.getElementById('terms')?.checked) {
    Toast.error('Accept the terms before creating your account.');
    return;
  }

  Utils.setButtonLoading(button, true, 'Creating account...');

  try {
    await API.auth.register(payload);
    Toast.success('Account created. Check your email to verify it.');
    
    // Show verify step
    const registerWrapper = document.getElementById('register-wrapper');
    const verifyWrapper = document.getElementById('verify-wrapper');
    const emailDisplay = document.getElementById('verify-email-display');
    
    if (registerWrapper && verifyWrapper) {
      registerWrapper.classList.add('hidden');
      verifyWrapper.classList.remove('hidden');
      if (emailDisplay) emailDisplay.textContent = payload.email;
      initVerifyStep(payload.email);
    } else {
      window.location.href = 'login.html';
    }
  } catch (error) {
    Auth.clear();
    if (error.errors) {
      Object.values(error.errors).flat().forEach(msg => Toast.error(msg));
    } else {
      let msg = error.message || 'Could not create account.';
      if (msg.includes('\n')) {
        msg.split('\n').forEach(m => Toast.error(m));
      } else {
        Toast.error(msg);
      }
    }
  } finally {
    Utils.setButtonLoading(button, false);
  }
}

function registrationPayload() {
  const firstName = document.getElementById('fname')?.value.trim() || '';
  const lastName = document.getElementById('lname')?.value.trim() || '';

  return {
    name: `${firstName} ${lastName}`.trim(),
    email: document.getElementById('reg-email')?.value.trim() || '',
    student_id: document.getElementById('student-id')?.value.trim() || null,
    department: document.getElementById('reg-dept')?.value.trim() || null,
    password: document.getElementById('reg-pass')?.value || '',
    password_confirmation: document.getElementById('reg-confirm')?.value || '',
  };
}

function initPasswordValidation() {
  const pwdInput = document.getElementById('reg-pass');
  const confirmInput = document.getElementById('reg-confirm');
  const matchIcon = document.getElementById('match-icon');

  const ruleLen = document.getElementById('rule-len');
  const ruleUp = document.getElementById('rule-up');
  const ruleNum = document.getElementById('rule-num');
  const ruleSp = document.getElementById('rule-sp');

  const segments = document.querySelectorAll('.pwd-meter .meter-seg');

  if (!pwdInput) return;

  function updateRules() {
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
      if (idx < score) seg.classList.add(`meter-seg--score-${score}`);
    });

    updateConfirm();
  }

  function updateConfirm() {
    if (!confirmInput || !matchIcon) return;
    const pwdVal = pwdInput.value;
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
  }

  pwdInput.addEventListener('input', updateRules);
  if (confirmInput) {
    confirmInput.addEventListener('input', updateConfirm);
  }
}

function initVerifyStep(email) {
  const resendBtn = document.getElementById('resend-btn');
  const editBtn = document.getElementById('edit-register-btn');
  const registerWrapper = document.getElementById('register-wrapper');
  const verifyWrapper = document.getElementById('verify-wrapper');

  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      verifyWrapper.classList.add('hidden');
      registerWrapper.classList.remove('hidden');
    });
  }

  if (!resendBtn) return;
  
  resendBtn.disabled = false;
  resendBtn.textContent = 'Resend Verification Email';
  
  resendBtn.addEventListener('click', async () => {
    try {
      Utils.setButtonLoading(resendBtn, true, 'Sending...');
      await API.auth.resendVerification(email);
      Toast.success('Verification email sent!');
      
      let seconds = 30;
      resendBtn.disabled = true;
      resendBtn.textContent = `⏱️ Resend in ${seconds}s`;
      
      const timer = setInterval(() => {
        seconds--;
        resendBtn.textContent = `⏱️ Resend in ${seconds}s`;
        if (seconds <= 0) {
          clearInterval(timer);
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Verification Email';
        }
      }, 1000);
    } catch (error) {
      Toast.error(error.message || 'Could not resend email.');
      Utils.setButtonLoading(resendBtn, false);
      resendBtn.textContent = 'Resend Verification Email';
    }
  });
}
