document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('ready');
  if (!requirePublic()) return;
  initNavbar();

  // get the email from the URL so we know who to send the mail to
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  // show the email on the screen so the user knows where we sent it
  const emailDisplay = document.getElementById('verify-email');
  if (emailDisplay) {
    emailDisplay.textContent = email || 'your email address';
  }

  const resendBtn = document.getElementById('resend-btn');
  const resendCountdown = document.getElementById('resend-countdown');

  // hide the resend link at start and show the countdown text
  if (resendBtn) {
    resendBtn.classList.add('hidden');
  }
  if (resendCountdown) {
    resendCountdown.classList.remove('hidden');
  }

  let countdownValue = 30;
  let timerInterval = null;

  // starting the 30 sec timer so they can't spam the email button
  function startCountdown() {
    countdownValue = 30;
    if (resendBtn) resendBtn.classList.add('hidden');
    if (resendCountdown) {
      resendCountdown.classList.remove('hidden');
      resendCountdown.textContent = `Resend in ${countdownValue}s`;
    }

    // stop any old timer if it's running
    clearInterval(timerInterval);
    
    // update every second
    timerInterval = setInterval(() => {
      countdownValue--;
      if (countdownValue <= 0) {
        // stop the timer when it hits 0
        clearInterval(timerInterval);
        if (resendCountdown) resendCountdown.classList.add('hidden');
        // show the clicky link now
        if (resendBtn) resendBtn.classList.remove('hidden');
      } else {
        if (resendCountdown) {
          resendCountdown.textContent = `Resend in ${countdownValue}s`;
        }
      }
    }, 1000);
  }

  // start the timer right away when page loads
  startCountdown();

  // when they click resend email link
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!email) {
        Toast.error('Email not found! Please register again.');
        return;
      }

      try {
        // disable click and show loading text
        Utils.setButtonLoading(resendBtn, true, 'Sending...');
        
        // calling our API to resend the verification mail
        const response = await API.auth.resendVerification(email);
        
        Toast.success(response.message || 'Verification mail sent!');
        
        // start the timer again
        startCountdown();
      } catch (error) {
        Toast.error(error.message || 'Could not send verification email.');
      } finally {
        if (resendBtn) {
          Utils.setButtonLoading(resendBtn, false);
          resendBtn.classList.remove('verify-link--disabled');
        }
      }
    });
  }


});
