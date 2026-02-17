/* ============================================
   MoneyMind — AI Engine
   Simulated AI for expense categorization,
   natural language parsing, and insight
   generation using keyword matching and
   rule-based analysis.
   ============================================ */

const AI = (() => {

  // ---- Category Keyword Map ---- //
  const CATEGORY_KEYWORDS = {
    'Food & Dining': [
      'food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger',
      'coffee', 'cafe', 'starbucks', 'mcdonalds', 'kfc', 'subway', 'sushi',
      'takeout', 'delivery', 'ubereats', 'doordash', 'grubhub', 'eat',
      'meal', 'dining', 'snack', 'drink', 'bar', 'pub', 'noodles', 'chicken',
      'rice', 'soup', 'taco', 'brunch', 'bistro', 'deli', 'bakery',
    ],
    'Groceries': [
      'grocery', 'groceries', 'supermarket', 'walmart', 'costco', 'aldi',
      'lidl', 'tesco', 'kroger', 'safeway', 'whole foods', 'vegetables',
      'fruits', 'meat', 'milk', 'eggs', 'bread', 'produce', 'market',
    ],
    'Transportation': [
      'uber', 'lyft', 'taxi', 'cab', 'bus', 'train', 'metro', 'subway',
      'gas', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'car',
      'auto', 'vehicle', 'commute', 'transport', 'flight', 'airline',
      'bolt', 'grab', 'ride', 'fare',
    ],
    'Shopping': [
      'amazon', 'shop', 'shopping', 'buy', 'purchase', 'clothes', 'shoes',
      'electronics', 'gadget', 'phone', 'laptop', 'computer', 'tablet',
      'furniture', 'decor', 'ikea', 'target', 'mall', 'store', 'ebay',
      'aliexpress', 'fashion', 'accessories', 'jewelry',
    ],
    'Entertainment': [
      'movie', 'cinema', 'theater', 'concert', 'game', 'gaming', 'steam',
      'playstation', 'xbox', 'nintendo', 'tickets', 'show', 'party',
      'club', 'bowling', 'amusement', 'park', 'festival', 'event',
    ],
    'Bills & Utilities': [
      'electricity', 'electric', 'power', 'water', 'gas bill', 'internet',
      'wifi', 'broadband', 'phone bill', 'mobile plan', 'utility',
      'utilities', 'bill', 'cable', 'sewage', 'trash', 'waste',
    ],
    'Subscription': [
      'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'apple music',
      'youtube premium', 'amazon prime', 'subscription', 'membership',
      'monthly', 'renewal', 'premium', 'pro plan', 'annual plan',
      'chatgpt', 'openai', 'github', 'figma', 'notion', 'slack',
      'adobe', 'microsoft 365', 'icloud', 'dropbox',
    ],
    'Health': [
      'doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'drug',
      'health', 'medical', 'dental', 'dentist', 'therapy', 'gym',
      'fitness', 'supplement', 'vitamin', 'prescription', 'checkup',
    ],
    'Education': [
      'course', 'class', 'tuition', 'school', 'university', 'college',
      'book', 'books', 'textbook', 'udemy', 'coursera', 'skillshare',
      'education', 'training', 'workshop', 'seminar', 'tutorial',
    ],
    'Travel': [
      'hotel', 'airbnb', 'hostel', 'booking', 'flight', 'airline',
      'travel', 'vacation', 'trip', 'resort', 'cruise', 'luggage',
      'passport', 'visa', 'airport',
    ],
    'Rent & Housing': [
      'rent', 'mortgage', 'lease', 'apartment', 'housing', 'house',
      'landlord', 'property', 'maintenance', 'repair', 'plumber',
      'electrician', 'renovation',
    ],
    'Personal Care': [
      'haircut', 'salon', 'spa', 'barber', 'beauty', 'cosmetics',
      'makeup', 'skincare', 'massage', 'manicure', 'pedicure',
      'grooming', 'shampoo', 'fragrance', 'perfume',
    ],
    'Gifts & Donations': [
      'gift', 'present', 'donation', 'charity', 'birthday', 'wedding',
      'anniversary', 'tip', 'giving',
    ],
    'Insurance': [
      'insurance', 'premium', 'coverage', 'policy', 'life insurance',
      'car insurance', 'health insurance', 'home insurance',
    ],
    'Investments': [
      'investment', 'invest', 'stock', 'crypto', 'bitcoin', 'ethereum',
      'mutual fund', 'etf', 'bond', 'savings', 'retirement', '401k',
      'portfolio', 'dividend', 'trading',
    ],
  };

  // ---- Amount Extraction ---- //
  function _extractAmount(text) {
    const lower = text.toLowerCase();

    // Match patterns like $45, $45.99, 15k, 15K, 2.5k
    const patterns = [
      /(?:[$€£¥₹₦₱₩])\s*([\d,]+(?:\.\d{1,2})?)\s*k?\b/i,
      /(\d[\d,]*(?:\.\d{1,2})?)\s*k\b/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|euro?s?|pounds?|rupees?|naira|pesos?)/i,
      /(?:paid|spent|cost|bought|charged|pay)\s+(?:[$€£¥₹₦₱₩])?\s*([\d,]+(?:\.\d{1,2})?)\s*k?\b/i,
      /(?:for|of)\s+(?:[$€£¥₹₦₱₩])?\s*([\d,]+(?:\.\d{1,2})?)\s*k?\b/i,
      /([\d,]+(?:\.\d{1,2})?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        // Check if the original match includes 'k'
        const fullMatch = match[0].toLowerCase();
        if (fullMatch.includes('k') && amount < 10000) {
          amount *= 1000;
        }
        if (amount > 0 && amount < 100000000) {
          return amount;
        }
      }
    }

    return null;
  }

  // ---- Category Detection ---- //
  function _detectCategory(text) {
    const lower = text.toLowerCase();
    const scores = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      scores[category] = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          // Longer keyword matches get higher scores
          scores[category] += keyword.length;
        }
      }
    }

    let bestCategory = 'Other';
    let bestScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return { category: bestCategory, confidence: Math.min(bestScore * 10, 95) };
  }

  // ---- Note Extraction ---- //
  function _extractNote(text, amount, category) {
    // Clean up the input to create a meaningful note
    let note = text.trim();

    // Remove common prefixes
    note = note.replace(/^(i\s+)?(paid|spent|bought|purchased|got|charged)\s+(for\s+)?/i, '');
    // Remove amount-related text
    note = note.replace(/[$€£¥₹₦₱₩]?\s*[\d,]+\.?\d*\s*k?\s*(dollars?|usd|euro?s?|pounds?|rupees?|naira|pesos?)?\s*(for|on)?\s*/gi, '');
    // Clean up
    note = note.replace(/^\s*(for|on|at)\s+/i, '').trim();

    if (note.length < 2) {
      note = category + ' expense';
    }

    // Capitalize first letter
    return note.charAt(0).toUpperCase() + note.slice(1);
  }

  // ---- Public: Parse Expense Text ---- //
  function parseExpenseText() {
    const input = document.getElementById('ai-text-input');
    const resultDiv = document.getElementById('ai-result');
    const text = input.value.trim();

    if (!text) {
      App.showToast('Please type a description of your expense.', 'error');
      return;
    }

    // Simulate AI "thinking" delay
    const btn = document.getElementById('ai-parse-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-dots">Analyzing</span>';

    setTimeout(() => {
      const amount = _extractAmount(text);
      const { category, confidence } = _detectCategory(text);
      const note = _extractNote(text, amount, category);

      if (!amount) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML =
          '<div class="ai-result-header">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' +
            ' Couldn\'t detect amount' +
          '</div>' +
          '<p style="font-size: 0.8125rem; color: var(--text-secondary);">Try including a number, e.g., "Paid $50 for dinner" or "Spent 15k on rent".</p>';
        _resetBtn(btn);
        return;
      }

      const formattedAmount = DataStore.formatCurrency(amount);
      const icon = DataStore.CATEGORY_ICONS[category] || '📦';

      var safeNote = note.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

      resultDiv.style.display = 'block';
      resultDiv.innerHTML =
        '<div class="ai-result-header">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
          ' AI Analysis Complete — ' + confidence + '% confidence' +
        '</div>' +
        '<div class="ai-result-fields">' +
          '<div class="ai-field">' +
            '<span class="ai-field-label">Amount</span>' +
            '<span class="ai-field-value">' + formattedAmount + '</span>' +
          '</div>' +
          '<div class="ai-field">' +
            '<span class="ai-field-label">Category</span>' +
            '<span class="ai-field-value">' + icon + ' ' + category + '</span>' +
          '</div>' +
          '<div class="ai-field">' +
            '<span class="ai-field-label">Note</span>' +
            '<span class="ai-field-value">' + note + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ai-result-actions">' +
          '<button class="btn btn-primary btn-sm" data-action="ai-confirm" data-amount="' + amount + '" data-category="' + category + '" data-note="' + safeNote + '">' +
            'Add This Expense' +
          '</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="ai-fill" data-amount="' + amount + '" data-category="' + category + '" data-note="' + safeNote + '">' +
            'Edit First' +
          '</button>' +
        '</div>';

      _resetBtn(btn);
    }, 600 + Math.random() * 400);
  }

  function _resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> AI Categorize';
  }

  function confirmParsedExpense(amount, category, note) {
    const today = new Date().toISOString().split('T')[0];
    DataStore.addExpense({ amount, category, note, date: today });

    document.getElementById('ai-text-input').value = '';
    document.getElementById('ai-result').style.display = 'none';

    App.showToast('Expense added via AI!', 'success');
    App.refreshCurrentView();
  }

  function fillForm(amount, category, note) {
    document.getElementById('expense-amount').value = amount;
    document.getElementById('expense-category').value = category;
    document.getElementById('expense-note').value = note;
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('ai-result').style.display = 'none';
    document.getElementById('ai-text-input').value = '';

    // Scroll to manual form
    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---- Insights Generation ---- //
  function generateInsights() {
    const expenses = DataStore.getCurrentMonthExpenses();
    const allExpenses = DataStore.getExpenses();
    const subscriptions = DataStore.getSubscriptions();
    const user = DataStore.getCurrentUser();
    const insights = [];

    if (expenses.length === 0) {
      return [{
        type: 'info',
        icon: '💡',
        title: 'Start Tracking',
        body: 'Add your first expense to receive personalized AI insights about your spending habits.',
        severity: 'info',
      }];
    }

    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = user ? user.monthlyBudget : 0;

    // ---- Category Breakdown Analysis ---- //
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
      const [topCat, topAmount] = sortedCategories[0];
      const percentage = Math.round((topAmount / totalSpend) * 100);
      const icon = DataStore.CATEGORY_ICONS[topCat] || '📦';

      insights.push({
        type: 'pattern',
        icon: icon,
        title: `${topCat} is your top spending category`,
        body: `You spend ${percentage}% of your monthly expenses on ${topCat} (${DataStore.formatCurrency(topAmount)}). ${percentage > 40 ? 'This is a significant portion — consider if there are ways to optimize.' : 'This seems proportional to a balanced budget.'}`,
        severity: percentage > 40 ? 'warning' : 'info',
        metric: `${percentage}%`,
      });
    }

    // ---- Budget Analysis ---- //
    if (budget > 0) {
      const percentUsed = Math.round((totalSpend / budget) * 100);
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

      if (percentUsed > monthProgress + 15) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          title: 'Spending ahead of schedule',
          body: `You've used ${percentUsed}% of your budget but we're only ${monthProgress}% through the month. At this rate, you'll exceed your budget by ${DataStore.formatCurrency(totalSpend * (daysInMonth / dayOfMonth) - budget)}.`,
          severity: 'danger',
          metric: `${percentUsed}% used`,
        });
      } else if (percentUsed < monthProgress - 20) {
        insights.push({
          type: 'positive',
          icon: '🎯',
          title: 'Under budget — great discipline!',
          body: `You've only used ${percentUsed}% of your budget at ${monthProgress}% through the month. You could save approximately ${DataStore.formatCurrency(budget - totalSpend * (daysInMonth / dayOfMonth))} this month.`,
          severity: 'success',
          metric: `${percentUsed}% used`,
        });
      }
    }

    // ---- Subscription Analysis ---- //
    if (subscriptions.length > 0) {
      const activeSubs = subscriptions.filter(s => s.active);
      const subTotal = activeSubs.reduce((sum, s) => sum + s.amount, 0);
      const yearlySubCost = subTotal * 12;

      if (activeSubs.length >= 3) {
        insights.push({
          type: 'suggestion',
          icon: '🔄',
          title: `${activeSubs.length} active subscriptions costing ${DataStore.formatCurrency(subTotal)}/month`,
          body: `That's ${DataStore.formatCurrency(yearlySubCost)} per year. Review your subscriptions — even cutting one could save you ${DataStore.formatCurrency(activeSubs[activeSubs.length - 1].amount * 12)}/year. Do you actually use all of them?`,
          severity: 'warning',
          metric: DataStore.formatCurrency(subTotal) + '/mo',
        });
      }

      // Check for potentially duplicate categories
      const subCategories = {};
      activeSubs.forEach(s => {
        subCategories[s.category] = (subCategories[s.category] || 0) + 1;
      });

      for (const [cat, count] of Object.entries(subCategories)) {
        if (count >= 2) {
          const dupes = activeSubs.filter(s => s.category === cat);
          const dupeTotal = dupes.reduce((sum, s) => sum + s.amount, 0);
          insights.push({
            type: 'suggestion',
            icon: '🔍',
            title: `${count} ${cat} subscriptions detected`,
            body: `You have ${count} subscriptions in ${cat}: ${dupes.map(s => s.name).join(', ')}. Combined cost: ${DataStore.formatCurrency(dupeTotal)}/month. Could you consolidate to just one?`,
            severity: 'info',
            metric: DataStore.formatCurrency(dupeTotal) + '/mo',
          });
          break; // Only show first duplicate category
        }
      }
    }

    // ---- Daily Pattern Analysis ---- //
    if (expenses.length >= 5) {
      const dayTotals = {};
      expenses.forEach(e => {
        const dayName = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
        dayTotals[dayName] = (dayTotals[dayName] || 0) + e.amount;
      });

      const dayCounts = {};
      expenses.forEach(e => {
        const dayName = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      });

      const dayAverages = {};
      for (const [day, total] of Object.entries(dayTotals)) {
        dayAverages[day] = total / (dayCounts[day] || 1);
      }

      const sortedDays = Object.entries(dayAverages).sort((a, b) => b[1] - a[1]);
      if (sortedDays.length > 0) {
        const [topDay, topAvg] = sortedDays[0];
        insights.push({
          type: 'pattern',
          icon: '📅',
          title: `${topDay}s are your highest-spend days`,
          body: `You average ${DataStore.formatCurrency(topAvg)} on ${topDay}s. Consider planning your ${topDay} activities more carefully or setting a daily limit.`,
          severity: 'info',
          metric: DataStore.formatCurrency(topAvg),
        });
      }
    }

    // ---- Frequency Analysis ---- //
    if (expenses.length >= 3) {
      const catCounts = {};
      expenses.forEach(e => {
        catCounts[e.category] = (catCounts[e.category] || 0) + 1;
      });

      const sortedByFreq = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      if (sortedByFreq.length > 0 && sortedByFreq[0][1] >= 3) {
        const [freqCat, freqCount] = sortedByFreq[0];
        const icon = DataStore.CATEGORY_ICONS[freqCat] || '📦';
        insights.push({
          type: 'pattern',
          icon: icon,
          title: `${freqCount} transactions in ${freqCat} this month`,
          body: `${freqCat} is your most frequent expense category. Small purchases add up — consider bundling or reducing frequency.`,
          severity: 'info',
          metric: `${freqCount} transactions`,
        });
      }
    }

    // ---- Large Expense Detection ---- //
    if (expenses.length >= 3) {
      const avgExpense = totalSpend / expenses.length;
      const largeExpenses = expenses.filter(e => e.amount > avgExpense * 2.5);

      if (largeExpenses.length > 0) {
        const largest = largeExpenses.sort((a, b) => b.amount - a.amount)[0];
        insights.push({
          type: 'alert',
          icon: '💰',
          title: 'Large expense detected',
          body: `"${largest.note || largest.category}" at ${DataStore.formatCurrency(largest.amount)} is ${Math.round(largest.amount / avgExpense)}x your average expense of ${DataStore.formatCurrency(avgExpense)}.`,
          severity: 'warning',
          metric: DataStore.formatCurrency(largest.amount),
        });
      }
    }

    // ---- Savings Potential ---- //
    if (budget > 0 && subscriptions.length > 0) {
      const subTotal = subscriptions.filter(s => s.active).reduce((sum, s) => sum + s.amount, 0);
      const nonSubSpend = totalSpend - (categoryTotals['Subscription'] || 0);
      const potentialSaving = Math.round(subTotal * 0.3);

      if (potentialSaving > 0) {
        insights.push({
          type: 'suggestion',
          icon: '💡',
          title: 'Potential monthly savings',
          body: `By reviewing and optimizing your subscriptions, you could potentially save up to ${DataStore.formatCurrency(potentialSaving)}/month (${DataStore.formatCurrency(potentialSaving * 12)}/year). Even small cuts compound over time.`,
          severity: 'success',
          metric: DataStore.formatCurrency(potentialSaving) + '/mo',
        });
      }
    }

    // Add a motivational insight if they have few expenses
    if (expenses.length > 0 && expenses.length < 5) {
      insights.push({
        type: 'tip',
        icon: '🚀',
        title: 'Keep logging for better insights',
        body: `You have ${expenses.length} expense${expenses.length > 1 ? 's' : ''} logged. The more data MoneyMind has, the more accurate and personalized your insights become. Aim for logging daily.`,
        severity: 'info',
      });
    }

    return insights;
  }

  return {
    parseExpenseText,
    confirmParsedExpense,
    fillForm,
    generateInsights,
  };
})();