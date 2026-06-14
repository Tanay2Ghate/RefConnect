/* ============================================
   RefConnect — auth.js
   Login & Registration logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Login Form ----------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const errorEl = document.getElementById('login-error');

      if (!email || !password) {
        if (errorEl) errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
      if (errorEl) errorEl.textContent = '';

      try {
        await api.post('/api/auth/login', { email, password });
        showToast('Login successful! Redirecting…', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (error) {
        const msg = error.message || 'Invalid email or password.';
        if (errorEl) errorEl.textContent = msg;
        showToast(msg, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // ---------- Register Form ----------
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const role = document.getElementById('reg-role').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const errorEl = document.getElementById('register-error');

      // Clear previous errors
      if (errorEl) errorEl.textContent = '';

      // Validation
      if (!name || !email || !password || !confirmPassword || !role) {
        if (errorEl) errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      // Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
        return;
      }

      // Password length
      if (password.length < 6) {
        if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
        return;
      }

      // Passwords match
      if (password !== confirmPassword) {
        if (errorEl) errorEl.textContent = 'Passwords do not match.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';

      try {
        await api.post('/api/auth/register', { name, email, password, role });
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (error) {
        const msg = error.message || 'Registration failed. Please try again.';
        if (errorEl) errorEl.textContent = msg;
        showToast(msg, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
});
