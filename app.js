/* ============================================
   MoneyMind — Core Application
   Routing, initialization, view rendering,
   and all UI interactions.
   
   Uses event delegation for ALL click handling
   to guarantee buttons work across all browsers.
   ============================================ */

const App = (() => {

  let currentView = 'dashboard';
  let sidebarOpen = false;

  // ---- Initialization ---- //
  function init() {
    _bindAllEvents();

    // Check if user is already logged in
    if (Auth.isLoggedIn()) {
      enterApp(false);
    } else {
      showPage('landing');
    }

    // Set today's date on expense form
    _setDateToToday();
  }

  // ---- Centralized Event Binding ---- //
  function _bindAllEvents() {
    // Global click delegation — handles ALL buttons/links in the app
    document.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      var action = target.getAttribute('data-action');
      var param = target.getAttribute('data-param') || '';

      switch (action) {
        // Page navigation (landing/auth)
        case 'show-page':
          showPage(param);
          break;

        // App view navigation (sidebar)
        case 'navigate':
          navigate(param);
          break;

        // Auth
        case 'logout':
          Auth.logout();
          break;

        // Budget
        case 'save-budget':
          saveBudget();
          break;

        // Sidebar
        case 'toggle-sidebar':
          toggleSidebar();
          break;

        // Expenses
        case 'delete-expense':
          deleteExpense(param);
          break;

        // Subscriptions
        case 'delete-subscription':
          deleteSubscription(param);
          break;

        // AI
        case 'ai-parse':
          AI.parseExpenseText();
          break;
        case 'ai-confirm':
          // Parsed from data attributes
          var amount = parseFloat(target.getAttribute('data-amount'));
          var category = target.getAttribute('data-category');
          var note = target.getAttribute('data-note');
          AI.confirmParsedExpense(amount, category, note);
          break;
        case 'ai-fill':
          var amount2 = parseFloat(target.getAttribute('data-amount'));
          var category2 = target.getAttribute('data-category');
          var note2 = target.getAttribute('data-note');
          AI.fillForm(amount2, category2, note2);
          break;

        // Insights
        case 'refresh-insights':
          refreshInsights();
          break;

        // Data management
        case 'export-data':
          exportData();
          break;
        case 'clear-data':
          clearAllData();
          break;
      }
    });

    // Form submissions
    var signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        Auth.signup(e);
      });
    }

    var loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        Auth.login(e);
      });
    }

    var expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
      expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense(e);
      });
    }

    var subForm = document.getElementById('subscription-form');
    if (subForm) {
      subForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addSubscription(e);
      });
    }

    var settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings(e);
      });
    }

    // AI input — enter key
    var aiInput = document.getElementById('ai-text-input');
    if (aiInput) {
      aiInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          AI.parseExpenseText();
        }
      });
    }

    // Keyboard shortcut
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (Auth.isLoggedIn()) {
          navigate('add-expense');
          setTimeout(function() {
            var input = document.getElementById('ai-text-input');
            if (input) input.focus();
          }, 150);
        }
      }
    });

    // Sidebar backdrop click
    document.addEventListener('click', function(e) {
      if (e.target.classList && e.target.classList.contains('sidebar-backdrop')) {
        toggleSidebar();
      }
    });
  }

  // ---- Page Management (Landing/Auth/App) ---- //
  function _hideAllPages() {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
  }

  function showPage(pageId) {
    _hideAllPages();

    var page = document.getElementById('page-' + pageId);
    if (page) {
      page.classList.add('active');
    }

    // Close sidebar if open
    if (sidebarOpen) toggleSidebar();

    // Scroll to top
    window.scrollTo(0, 0);
  }

  function enterApp(isNewUser) {
    _hideAllPages();

    var appShell = document.getElementById('app-shell');
    if (appShell) {
      appShell.classList.add('active');
    }

    // Update user info in sidebar
    _updateUserBadge();
    _updateCurrencyBadge();

    // Check if budget is set
    var user = DataStore.getCurrentUser();
    var budgetSetup = document.getElementById('budget-setup');
    if (budgetSetup) {
      if (isNewUser || !user || !user.monthlyBudget || user.monthlyBudget <= 0) {
        budgetSetup.style.display = 'flex';
      } else {
        budgetSetup.style.display = 'none';
      }
    }

    // Navigate to dashboard
    navigate('dashboard');
  }

  // ---- View Navigation ---- //
  function navigate(viewName) {
    currentView = viewName;

    // Hide all views
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('active');
    }

    // Show target view
    var view = document.getElementById('view-' + viewName);
    if (view) {
      view.classList.add('active');
    }

    // Update sidebar active state
    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      var item = navItems[j];
      if (item.getAttribute('data-param') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }

    // Update page title
    var titles = {
      'dashboard': 'Dashboard',
      'add-expense': 'Add Expense',
      'subscriptions': 'Subscriptions',
      'insights': 'AI Insights',
      'settings': 'Settings',
    };
    var titleEl = document.getElementById('page-title');
    if (titleEl) {
      titleEl.textContent = titles[viewName] || 'Dashboard';
    }

    // Render view content
    _renderView(viewName);

    // Reset date on expense form when navigating to it
    if (viewName === 'add-expense') {
      _setDateToToday();
    }

    // Close sidebar on mobile
    if (sidebarOpen && window.innerWidth <= 768) {
      toggleSidebar();
    }

    // Scroll main content to top
    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
  }

  function _renderView(viewName) {
    switch (viewName) {
      case 'dashboard':
        _renderDashboard();
        break;
      case 'add-expense':
        _renderExpenseHistory();
        break;
      case 'subscriptions':
        _renderSubscriptions();
        break;
      case 'insights':
        _renderInsights();
        break;
      case 'settings':
        _renderSettings();
        break;
    }
  }

  // ---- Sidebar Toggle ---- //
  function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.querySelector('.sidebar-backdrop');

    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
      if (sidebar) sidebar.classList.add('open');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
      }
      backdrop.classList.add('active');
    } else {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) {
        backdrop.classList.remove('active');
      }
    }
  }

  // ---- Budget Setup ---- //
  function saveBudget() {
    var input = document.getElementById('budget-input');
    var amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
      showToast('Please enter a valid budget amount.', 'error');
      return;
    }

    DataStore.updateUser({ monthlyBudget: amount });
    var budgetSetup = document.getElementById('budget-setup');
    if (budgetSetup) budgetSetup.style.display = 'none';
    showToast('Monthly budget set to ' + DataStore.formatCurrency(amount), 'success');
    _renderDashboard();
  }

  // ---- Dashboard Rendering ---- //
  function _renderDashboard() {
    var summary = Predictions.getSummary();

    // Summary cards
    _setText('total-spend', DataStore.formatCurrency(summary.totalSpend));
    _setText('spend-vs-budget',
      summary.budget > 0
        ? 'of ' + DataStore.formatCurrency(summary.budget) + ' budget (' + summary.utilization + '%)'
        : 'No budget set'
    );
    _setText('burn-rate', DataStore.formatCurrency(summary.burnRate));

    // Runway
    var runwayEl = document.getElementById('runway-days');
    var runwaySubEl = document.getElementById('runway-sub');
    if (runwayEl && runwaySubEl) {
      if (summary.runwayDays < 0) {
        runwayEl.textContent = '-- days';
        runwayEl.style.color = 'var(--green)';
        runwaySubEl.textContent = 'set a budget to see prediction';
      } else if (summary.runwayDays === 0) {
        runwayEl.textContent = '0 days';
        runwayEl.style.color = 'var(--red)';
        runwaySubEl.textContent = 'budget exceeded!';
      } else {
        runwayEl.textContent = summary.runwayDays + ' days';
        runwayEl.style.color = summary.runwayDays < 7 ? 'var(--red)' : summary.runwayDays < 14 ? 'var(--orange)' : 'var(--green)';
        runwaySubEl.textContent = 'at current spending rate';
      }
    }

    // Subscriptions
    _setText('sub-total', DataStore.formatCurrency(summary.subCost));
    _setText('sub-count', summary.subCount + ' active');

    // Alerts
    _renderAlerts(summary);

    // Charts
    setTimeout(function() { Charts.renderAll(); }, 100);

    // Recent expenses
    _renderRecentExpenses();
  }

  function _renderAlerts(summary) {
    var container = document.getElementById('dashboard-alerts');
    if (!container) return;
    var alerts = [];

    // Budget warning
    if (summary.budget > 0 && summary.utilization >= 80) {
      if (summary.utilization >= 100) {
        alerts.push({
          type: 'danger',
          icon: '\uD83D\uDEA8',
          text: 'You\'ve exceeded your monthly budget by ' + DataStore.formatCurrency(summary.totalSpend - summary.budget) + '. Consider pausing non-essential spending.',
        });
      } else {
        alerts.push({
          type: 'warning',
          icon: '\u26A0\uFE0F',
          text: 'You\'ve used ' + summary.utilization + '% of your budget. ' + DataStore.formatCurrency(summary.remaining) + ' remaining for the rest of the month.',
        });
      }
    }

    // Runway warning
    if (summary.runwayDays >= 0 && summary.runwayDays < 7 && summary.runwayDays > 0) {
      alerts.push({
        type: 'warning',
        icon: '\u23F3',
        text: 'At current spending, you\'ll run out of budget in ' + summary.runwayDays + ' day' + (summary.runwayDays !== 1 ? 's' : '') + '. Daily burn rate: ' + DataStore.formatCurrency(summary.burnRate) + '.',
      });
    }

    // Upcoming subscriptions
    var upcoming = DataStore.getUpcomingSubscriptions(5);
    for (var i = 0; i < upcoming.length; i++) {
      var sub = upcoming[i];
      if (sub.daysUntilDue === 0) {
        alerts.push({
          type: 'info',
          icon: '\uD83D\uDD04',
          text: sub.name + ' (' + DataStore.formatCurrency(sub.amount) + ') is due today.',
        });
      } else if (sub.daysUntilDue <= 3) {
        alerts.push({
          type: 'info',
          icon: '\uD83D\uDD14',
          text: sub.name + ' (' + DataStore.formatCurrency(sub.amount) + ') is due in ' + sub.daysUntilDue + ' day' + (sub.daysUntilDue !== 1 ? 's' : '') + '.',
        });
      }
    }

    if (alerts.length === 0) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    for (var j = 0; j < alerts.length; j++) {
      var a = alerts[j];
      html += '<div class="alert alert-' + a.type + '">' +
        '<span class="alert-icon">' + a.icon + '</span>' +
        '<span>' + a.text + '</span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function _renderRecentExpenses() {
    var container = document.getElementById('recent-expenses');
    if (!container) return;
    var expenses = DataStore.getCurrentMonthExpenses().slice(0, 8);

    if (expenses.length === 0) {
      container.innerHTML = '<div class="empty-state">No expenses logged yet. Start by adding your first expense.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < expenses.length; i++) {
      html += _expenseItemHTML(expenses[i]);
    }
    container.innerHTML = html;
  }

  function _expenseItemHTML(expense) {
    var icon = DataStore.CATEGORY_ICONS[expense.category] || '\uD83D\uDCE6';
    var color = DataStore.CATEGORY_COLORS[expense.category] || '#94a3b8';
    var date = new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return '<div class="expense-item">' +
      '<div class="expense-cat-icon" style="background: ' + color + '20; color: ' + color + ';">' + icon + '</div>' +
      '<div class="expense-details">' +
        '<div class="expense-title">' + _escapeHtml(expense.note || expense.category) + '</div>' +
        '<div class="expense-meta">' + expense.category + ' &middot; ' + date + '</div>' +
      '</div>' +
      '<div class="expense-amount">-' + DataStore.formatCurrency(expense.amount) + '</div>' +
      '<button class="expense-delete" data-action="delete-expense" data-param="' + expense.id + '" title="Delete">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
      '</button>' +
    '</div>';
  }

  // ---- Add Expense ---- //
  function addExpense(event) {
    if (event) event.preventDefault();

    var amount = parseFloat(document.getElementById('expense-amount').value);
    var category = document.getElementById('expense-category').value;
    var note = document.getElementById('expense-note').value.trim();
    var date = document.getElementById('expense-date').value;
    var errorEl = document.getElementById('expense-form-error');

    if (errorEl) errorEl.textContent = '';

    if (!amount || amount <= 0) {
      if (errorEl) errorEl.textContent = 'Please enter a valid amount.';
      return;
    }

    if (!category) {
      if (errorEl) errorEl.textContent = 'Please select a category.';
      return;
    }

    if (!date) {
      if (errorEl) errorEl.textContent = 'Please select a date.';
      return;
    }

    DataStore.addExpense({ amount: amount, category: category, note: note, date: date });

    // Reset form
    var form = document.getElementById('expense-form');
    if (form) form.reset();
    _setDateToToday();

    showToast('Expense of ' + DataStore.formatCurrency(amount) + ' added!', 'success');
    _renderExpenseHistory();
  }

  function deleteExpense(id) {
    DataStore.deleteExpense(id);
    showToast('Expense deleted.', 'info');
    refreshCurrentView();
  }

  function _renderExpenseHistory() {
    var container = document.getElementById('expense-history');
    var badge = document.getElementById('expense-count-badge');
    var expenses = DataStore.getCurrentMonthExpenses();

    if (badge) badge.textContent = expenses.length;

    if (!container) return;

    if (expenses.length === 0) {
      container.innerHTML = '<div class="empty-state">No expenses this month.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < expenses.length; i++) {
      html += _expenseItemHTML(expenses[i]);
    }
    container.innerHTML = html;
  }

  // ---- Subscriptions ---- //
  function addSubscription(event) {
    if (event) event.preventDefault();

    var name = document.getElementById('sub-name').value.trim();
    var amount = parseFloat(document.getElementById('sub-amount').value);
    var dueDay = parseInt(document.getElementById('sub-due').value, 10);
    var category = document.getElementById('sub-category').value;
    var errorEl = document.getElementById('sub-form-error');

    if (errorEl) errorEl.textContent = '';

    if (!name) {
      if (errorEl) errorEl.textContent = 'Please enter a service name.';
      return;
    }

    if (!amount || amount <= 0) {
      if (errorEl) errorEl.textContent = 'Please enter a valid amount.';
      return;
    }

    if (!dueDay || dueDay < 1 || dueDay > 31) {
      if (errorEl) errorEl.textContent = 'Please enter a valid billing day (1-31).';
      return;
    }

    DataStore.addSubscription({ name: name, amount: amount, dueDay: dueDay, category: category });

    var form = document.getElementById('subscription-form');
    if (form) form.reset();
    showToast(name + ' subscription added!', 'success');
    _renderSubscriptions();
  }

  function deleteSubscription(id) {
    DataStore.deleteSubscription(id);
    showToast('Subscription removed.', 'info');
    _renderSubscriptions();
  }

  function _renderSubscriptions() {
    var container = document.getElementById('subscription-list');
    var badge = document.getElementById('sub-total-badge');
    var subs = DataStore.getSubscriptions();
    var activeSubs = subs.filter(function(s) { return s.active; });
    var totalMonthly = activeSubs.reduce(function(sum, s) { return sum + s.amount; }, 0);

    if (badge) badge.textContent = DataStore.formatCurrency(totalMonthly) + '/mo';

    if (!container) return;

    if (subs.length === 0) {
      container.innerHTML = '<div class="empty-state">No subscriptions tracked. Add your first one above.</div>';
      return;
    }

    var today = new Date().getDate();
    var html = '';

    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var diff = sub.dueDay - today;
      if (diff < 0) {
        var daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        diff = daysInMonth - today + sub.dueDay;
      }

      var dueBadge = '';
      if (diff === 0) {
        dueBadge = '<span class="sub-due-badge sub-due-today">Due today</span>';
      } else if (diff <= 3) {
        dueBadge = '<span class="sub-due-badge sub-due-soon">Due in ' + diff + 'd</span>';
      }

      var initial = sub.name.charAt(0).toUpperCase();

      html += '<div class="sub-item">' +
        '<div class="sub-icon">' + initial + '</div>' +
        '<div class="sub-details">' +
          '<div class="sub-name">' + _escapeHtml(sub.name) + ' ' + dueBadge + '</div>' +
          '<div class="sub-meta">' + sub.category + ' &middot; Bills on the ' + _ordinal(sub.dueDay) + ' of each month</div>' +
        '</div>' +
        '<div class="sub-amount">' + DataStore.formatCurrency(sub.amount) + '</div>' +
        '<div class="sub-actions">' +
          '<button class="sub-action-btn delete" data-action="delete-subscription" data-param="' + sub.id + '" title="Remove">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
    }
    container.innerHTML = html;
  }

  // ---- Insights ---- //
  function _renderInsights() {
    var container = document.getElementById('insights-container');
    if (!container) return;
    var insights = AI.generateInsights();

    if (insights.length === 0) {
      container.innerHTML = '<div class="empty-state">Add some expenses to receive personalized insights.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < insights.length; i++) {
      var insight = insights[i];
      var severityColors = {
        success: { bg: 'var(--green-dim)', color: 'var(--green)' },
        warning: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
        danger: { bg: 'var(--red-dim)', color: 'var(--red)' },
        info: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
      };
      var sev = severityColors[insight.severity] || severityColors.info;

      html += '<div class="insight-card ' + insight.severity + '">' +
        '<div class="insight-header">' +
          '<div class="insight-icon" style="background: ' + sev.bg + '; color: ' + sev.color + ';">' + insight.icon + '</div>' +
          '<span class="insight-type" style="color: ' + sev.color + ';">' + insight.type + '</span>' +
        '</div>' +
        '<div class="insight-title">' + _escapeHtml(insight.title) + '</div>' +
        '<div class="insight-body">' + _escapeHtml(insight.body) + '</div>' +
        (insight.metric ? '<div class="insight-metric">' + insight.metric + '</div>' : '') +
      '</div>';
    }
    container.innerHTML = html;
  }

  function refreshInsights() {
    _renderInsights();
    showToast('Insights refreshed.', 'info');
  }

  // ---- Settings ---- //
  function _renderSettings() {
    var user = DataStore.getCurrentUser();
    if (!user) return;

    _setVal('settings-name', user.name || '');
    _setVal('settings-email', user.email || '');
    _setVal('settings-currency', user.currency || 'USD');
    _setVal('settings-budget', user.monthlyBudget || '');
  }

  function saveSettings(event) {
    if (event) event.preventDefault();

    var name = document.getElementById('settings-name').value.trim();
    var email = document.getElementById('settings-email').value.trim();
    var currency = document.getElementById('settings-currency').value;
    var budget = parseFloat(document.getElementById('settings-budget').value) || 0;
    var errorEl = document.getElementById('settings-error');
    var successEl = document.getElementById('settings-success');

    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = '';

    if (!name || name.length < 2) {
      if (errorEl) errorEl.textContent = 'Please enter a valid name.';
      return;
    }

    if (!email) {
      if (errorEl) errorEl.textContent = 'Please enter a valid email.';
      return;
    }

    DataStore.updateUser({ name: name, email: email, currency: currency, monthlyBudget: budget });
    _updateUserBadge();
    _updateCurrencyBadge();

    if (successEl) successEl.textContent = 'Settings saved successfully!';
    showToast('Settings updated!', 'success');

    setTimeout(function() { if (successEl) successEl.textContent = ''; }, 3000);
  }

  // ---- Data Management ---- //
  function exportData() {
    var data = DataStore.exportAllData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'moneymind-export-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Data exported successfully!', 'success');
  }

  function clearAllData() {
    if (!confirm('Are you sure? This will permanently delete all your expenses and subscriptions. This cannot be undone.')) {
      return;
    }

    DataStore.clearUserData();
    Charts.destroyAll();
    showToast('All data cleared.', 'info');
    navigate('dashboard');
  }

  // ---- Refresh Current View ---- //
  function refreshCurrentView() {
    _renderView(currentView);
    if (currentView === 'dashboard') {
      Charts.renderAll();
    }
  }

  // ---- Toast Notifications ---- //
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    toast.innerHTML = (icons[type] || icons.info) + '<span>' + _escapeHtml(message) + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
      toast.classList.add('toast-out');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // ---- Helpers ---- //
  function _updateUserBadge() {
    var user = DataStore.getCurrentUser();
    if (!user) return;

    var avatar = document.getElementById('sidebar-avatar');
    var nameEl = document.getElementById('sidebar-username');
    var emailEl = document.getElementById('sidebar-useremail');

    if (avatar) avatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.name || 'User';
    if (emailEl) emailEl.textContent = user.email || '';
  }

  function _updateCurrencyBadge() {
    var user = DataStore.getCurrentUser();
    var badge = document.getElementById('currency-badge');
    if (badge && user) {
      badge.textContent = user.currency || 'USD';
    }
  }

  function _escapeHtml(text) {
    if (!text) return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function _ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function _setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setDateToToday() {
    var dateInput = document.getElementById('expense-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  // ---- Public API ---- //
  return {
    init: init,
    showPage: showPage,
    enterApp: enterApp,
    navigate: navigate,
    toggleSidebar: toggleSidebar,
    saveBudget: saveBudget,
    addExpense: addExpense,
    deleteExpense: deleteExpense,
    addSubscription: addSubscription,
    deleteSubscription: deleteSubscription,
    refreshInsights: refreshInsights,
    saveSettings: saveSettings,
    exportData: exportData,
    clearAllData: clearAllData,
    refreshCurrentView: refreshCurrentView,
    showToast: showToast,
  };
})();

// ---- Bootstrap ---- //
document.addEventListener('DOMContentLoaded', App.init);