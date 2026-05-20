document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();
  initRegisterPage();
});

function initRegisterPage() {
  const form = document.querySelector('form');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitRegistration(form);
  });

  initPasswordValidation();
}

async function submitRegistration(form) {
  const button = document.getElementById('reg-btn') || form.querySelector('[type="submit"]');
  const originalText = button?.textContent || 'Create Account';
  const payload = registrationPayload();

  if (!payload.name || !payload.email || !payload.password || !payload.student_id) {
    Toast.error('Complete the required registration fields.');
    return;
  }

  // Strong password checks
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

  if (button) {
    button.disabled = true;
    button.textContent = 'Creating account...';
  }

  try {
    await API.auth.register(payload);
    Toast.success('Account created. Check your email to verify it.');
    window.location.href = `verify.html?email=${encodeURIComponent(payload.email)}`;
  } catch (error) {
    Auth.clear();
    Toast.error(error.message || 'Could not create account.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
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

    // Helper to toggle rule visual state
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

    // Calculate score
    const score = Object.values(rules).filter(Boolean).length;

    // Update meter segments
    segments.forEach((seg, idx) => {
      if (idx < score) {
        // Set segment color
        if (score === 1) {
          seg.style.backgroundColor = 'var(--color-danger)';
        } else if (score === 2) {
          seg.style.backgroundColor = 'var(--color-warning)';
        } else if (score === 3) {
          seg.style.backgroundColor = 'var(--color-accent)';
        } else if (score === 4) {
          seg.style.backgroundColor = 'var(--color-success)';
        }
      } else {
        seg.style.backgroundColor = '';
      }
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
