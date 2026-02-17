/* ============================================
   MoneyMind — Authentication Module
   Handles signup, login, logout with
   localStorage-simulated backend.
   ============================================ */

const Auth = (() => {

  function signup(event) {
    if (event) event.preventDefault();

    var nameEl = document.getElementById('signup-name');
    var emailEl = document.getElementById('signup-email');
    var passwordEl = document.getElementById('signup-password');
    var currencyEl = document.getElementById('signup-currency');
    var errorEl = document.getElementById('signup-error');

    if (!nameEl || !emailEl || !passwordEl || !currencyEl) return;

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    var password = passwordEl.value;
    var currency = currencyEl.value;

    if (errorEl) errorEl.textContent = '';

    // Validation
    if (!name || name.length < 2) {
      if (errorEl) errorEl.textContent = 'Please enter a valid name.';
      return;
    }

    if (!email || !_isValidEmail(email)) {
      if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    if (!password || password.length < 6) {
      if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    // Create user
    var result = DataStore.createUser(name, email, password, currency);

    if (result.error) {
      if (errorEl) errorEl.textContent = result.error;
      return;
    }

    // Log in the new user
    DataStore.setCurrentUser(result.user);

    // Clear form
    var form = document.getElementById('signup-form');
    if (form) form.reset();

    // Navigate to app
    App.enterApp(true);
    App.showToast('Welcome to MoneyMind! Let\'s set up your budget.', 'success');
  }

  function login(event) {
    if (event) event.preventDefault();

    var emailEl = document.getElementById('login-email');
    var passwordEl = document.getElementById('login-password');
    var errorEl = document.getElementById('login-error');

    if (!emailEl || !passwordEl) return;

    var email = emailEl.value.trim();
    var password = passwordEl.value;

    if (errorEl) errorEl.textContent = '';

    if (!email || !_isValidEmail(email)) {
      if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    if (!password) {
      if (errorEl) errorEl.textContent = 'Please enter your password.';
      return;
    }

    var result = DataStore.authenticateUser(email, password);

    if (result.error) {
      if (errorEl) errorEl.textContent = result.error;
      return;
    }

    DataStore.setCurrentUser(result.user);

    // Clear form
    var form = document.getElementById('login-form');
    if (form) form.reset();

    App.enterApp(false);
    App.showToast('Welcome back, ' + result.user.name + '!', 'success');
  }

  function logout() {
    DataStore.clearCurrentUser();
    try {
      Charts.destroyAll();
    } catch (e) {
      // Charts may not be initialized
    }
    App.showPage('landing');
    App.showToast('Logged out successfully.', 'info');
  }

  function isLoggedIn() {
    return DataStore.getCurrentUser() !== null;
  }

  function _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  return {
    signup: signup,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
  };
})();