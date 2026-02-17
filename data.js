/* ============================================
   MoneyMind — Data Layer
   localStorage-based persistence for expenses,
   subscriptions, user data, and settings.
   ============================================ */

const DataStore = (() => {
  const KEYS = {
    USERS: 'mm_users',
    CURRENT_USER: 'mm_current_user',
    EXPENSES: 'mm_expenses',
    SUBSCRIPTIONS: 'mm_subscriptions',
    SETTINGS: 'mm_settings',
  };

  const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5',
    INR: '\u20B9', NGN: '\u20A6', BRL: 'R$', CAD: 'C$',
    AUD: 'A$', KES: 'KSh', ZAR: 'R', MXN: 'Mex$',
    PHP: '\u20B1', KRW: '\u20A9', SEK: 'kr',
  };

  const CATEGORY_ICONS = {
    'Food & Dining': '🍽️',
    'Transportation': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Bills & Utilities': '💡',
    'Subscription': '🔄',
    'Health': '💊',
    'Education': '📚',
    'Travel': '✈️',
    'Groceries': '🛒',
    'Rent & Housing': '🏠',
    'Personal Care': '💇',
    'Gifts & Donations': '🎁',
    'Insurance': '🛡️',
    'Investments': '📈',
    'Other': '📦',
  };

  const CATEGORY_COLORS = {
    'Food & Dining': '#ff6b6b',
    'Transportation': '#4ecdc4',
    'Shopping': '#a855f7',
    'Entertainment': '#ff9f43',
    'Bills & Utilities': '#fbbf24',
    'Subscription': '#6366f1',
    'Health': '#f472b6',
    'Education': '#38bdf8',
    'Travel': '#34d399',
    'Groceries': '#84cc16',
    'Rent & Housing': '#fb923c',
    'Personal Care': '#e879f9',
    'Gifts & Donations': '#f87171',
    'Insurance': '#60a5fa',
    'Investments': '#22d3ee',
    'Other': '#94a3b8',
  };

  // ---- Helpers ---- //
  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('DataStore read error:', e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('DataStore write error:', e);
    }
  }

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function _getUserKey(baseKey) {
    const user = getCurrentUser();
    return user ? `${baseKey}_${user.id}` : baseKey;
  }

  // ---- Users ---- //
  function getUsers() {
    return _get(KEYS.USERS) || [];
  }

  function saveUsers(users) {
    _set(KEYS.USERS, users);
  }

  function findUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function createUser(name, email, password, currency) {
    const users = getUsers();
    const existing = findUserByEmail(email);
    if (existing) return { error: 'An account with this email already exists.' };

    const user = {
      id: _generateId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      currency: currency || 'USD',
      monthlyBudget: 0,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);
    return { user };
  }

  function authenticateUser(email, password) {
    const user = findUserByEmail(email);
    if (!user) return { error: 'No account found with this email.' };
    if (user.password !== password) return { error: 'Incorrect password.' };
    return { user };
  }

  function setCurrentUser(user) {
    const safeUser = { ...user };
    delete safeUser.password;
    _set(KEYS.CURRENT_USER, safeUser);
  }

  function getCurrentUser() {
    return _get(KEYS.CURRENT_USER);
  }

  function clearCurrentUser() {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }

  function updateUser(updates) {
    const current = getCurrentUser();
    if (!current) return;

    const users = getUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx === -1) return;

    Object.assign(users[idx], updates);
    saveUsers(users);

    const updated = { ...users[idx] };
    delete updated.password;
    setCurrentUser(updated);
    return updated;
  }

  // ---- Expenses ---- //
  function getExpenses() {
    return _get(_getUserKey(KEYS.EXPENSES)) || [];
  }

  function saveExpenses(expenses) {
    _set(_getUserKey(KEYS.EXPENSES), expenses);
  }

  function addExpense(expense) {
    const expenses = getExpenses();
    const newExpense = {
      id: _generateId(),
      amount: parseFloat(expense.amount),
      category: expense.category,
      note: expense.note || '',
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    saveExpenses(expenses);
    return newExpense;
  }

  function deleteExpense(id) {
    const expenses = getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    saveExpenses(filtered);
    return filtered;
  }

  function getMonthExpenses(year, month) {
    const expenses = getExpenses();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function getCurrentMonthExpenses() {
    const now = new Date();
    return getMonthExpenses(now.getFullYear(), now.getMonth());
  }

  // ---- Subscriptions ---- //
  function getSubscriptions() {
    return _get(_getUserKey(KEYS.SUBSCRIPTIONS)) || [];
  }

  function saveSubscriptions(subs) {
    _set(_getUserKey(KEYS.SUBSCRIPTIONS), subs);
  }

  function addSubscription(sub) {
    const subs = getSubscriptions();
    const newSub = {
      id: _generateId(),
      name: sub.name.trim(),
      amount: parseFloat(sub.amount),
      dueDay: parseInt(sub.dueDay),
      category: sub.category || 'Other',
      active: true,
      createdAt: new Date().toISOString(),
    };
    subs.unshift(newSub);
    saveSubscriptions(subs);
    return newSub;
  }

  function deleteSubscription(id) {
    const subs = getSubscriptions();
    const filtered = subs.filter(s => s.id !== id);
    saveSubscriptions(filtered);
    return filtered;
  }

  function updateSubscription(id, updates) {
    const subs = getSubscriptions();
    const idx = subs.findIndex(s => s.id === id);
    if (idx === -1) return null;
    Object.assign(subs[idx], updates);
    saveSubscriptions(subs);
    return subs[idx];
  }

  function getUpcomingSubscriptions(withinDays) {
    withinDays = withinDays || 7;
    const subs = getSubscriptions().filter(s => s.active);
    const today = new Date();
    const currentDay = today.getDate();

    return subs.filter(s => {
      let diff = s.dueDay - currentDay;
      if (diff < 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        diff = daysInMonth - currentDay + s.dueDay;
      }
      return diff >= 0 && diff <= withinDays;
    }).map(s => {
      let diff = s.dueDay - currentDay;
      if (diff < 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        diff = daysInMonth - currentDay + s.dueDay;
      }
      return { ...s, daysUntilDue: diff };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  // ---- Currency Formatting ---- //
  function formatCurrency(amount) {
    const user = getCurrentUser();
    const currency = user ? user.currency : 'USD';
    const symbol = CURRENCY_SYMBOLS[currency] || '$';

    const absAmount = Math.abs(amount);
    let formatted;

    if (currency === 'JPY' || currency === 'KRW') {
      formatted = Math.round(absAmount).toLocaleString();
    } else {
      formatted = absAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return (amount < 0 ? '-' : '') + symbol + formatted;
  }

  function getCurrencySymbol() {
    const user = getCurrentUser();
    const currency = user ? user.currency : 'USD';
    return CURRENCY_SYMBOLS[currency] || '$';
  }

  // ---- Data Management ---- //
  function exportAllData() {
    const user = getCurrentUser();
    return {
      user: user,
      expenses: getExpenses(),
      subscriptions: getSubscriptions(),
      exportedAt: new Date().toISOString(),
    };
  }

  function clearUserData() {
    const user = getCurrentUser();
    if (!user) return;
    localStorage.removeItem(_getUserKey(KEYS.EXPENSES));
    localStorage.removeItem(_getUserKey(KEYS.SUBSCRIPTIONS));
  }

  // ---- Public API ---- //
  return {
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    CURRENCY_SYMBOLS,

    getUsers,
    createUser,
    authenticateUser,
    findUserByEmail,
    setCurrentUser,
    getCurrentUser,
    clearCurrentUser,
    updateUser,

    getExpenses,
    addExpense,
    deleteExpense,
    getMonthExpenses,
    getCurrentMonthExpenses,

    getSubscriptions,
    addSubscription,
    deleteSubscription,
    updateSubscription,
    getUpcomingSubscriptions,

    formatCurrency,
    getCurrencySymbol,

    exportAllData,
    clearUserData,
  };
})();