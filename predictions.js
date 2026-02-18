/* ===========================================
   MoneyMind — Prediction Engine
   Calculates burn rate, runway days, budget
   forecasts, and spending projections.
   ============================================ */

const Predictions = (() => {

  /**
   * Calculate the daily burn rate for the current month.
   * burn rate = total spend this month / days elapsed
   */
  function getBurnRate() {
    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    const now = new Date();
    const dayOfMonth = now.getDate();

    if (dayOfMonth === 0 || expenses.length === 0) return 0;

    return totalSpend / dayOfMonth;
  }

  /**
   * Calculate budget runway in days using the user's spending pattern.
   *
   * Conceptually: "If my monthly budget is $1000 and I spend $5 per day,
   * how many days does that budget represent?"
   *
   * Here:
   * - monthlyBudget  ~= 1000 (user.monthlyBudget)
   * - dailySpend     ~= (total expenses this month / days elapsed)
   *   plus the daily equivalent of active subscriptions
   * - runwayDays     = monthlyBudget / dailySpend
   */
  function getRunwayDays() {
    const user = DataStore.getCurrentUser();
    if (!user || !user.monthlyBudget || user.monthlyBudget <= 0) return -1;

    const now = new Date();
    const dayOfMonth = now.getDate(); // 1-based
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Total variable expenses entered for the current month
    const expenses = DataStore.getCurrentMonthExpenses();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Safety: avoid divide-by-zero if we're at an invalid date context
    if (dayOfMonth <= 0) return -1;

    // Average daily variable expenses so far this month
    const dailyVariableSpend =
      totalExpenses > 0 ? totalExpenses / dayOfMonth : 0;

    // Convert active monthly subscriptions into an approximate daily spend
    const monthlySubs = getMonthlySubscriptionCost();
    const dailySubsSpend =
      monthlySubs > 0 && daysInMonth > 0 ? monthlySubs / daysInMonth : 0;

    // Combined daily spend if the user keeps spending like this every day
    const dailyTotalSpend = dailyVariableSpend + dailySubsSpend;

    // If there is no spending pattern yet, we can't estimate a meaningful runway
    if (dailyTotalSpend <= 0) return -1;

    // Core logic:
    // "How many days does my MONTHLY budget represent at this daily spend?"
    const runway = Math.floor(user.monthlyBudget / dailyTotalSpend);

    return runway >= 0 ? runway : -1;
  }

  /**
   * Get projected total spend for the month at current rate.
   */
  function getProjectedMonthlySpend() {
    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (dayOfMonth === 0 || expenses.length === 0) return 0;

    return (totalSpend / dayOfMonth) * daysInMonth;
  }

  /**
   * Get budget utilization percentage.
   */
  function getBudgetUtilization() {
    const user = DataStore.getCurrentUser();
    if (!user || !user.monthlyBudget || user.monthlyBudget <= 0) return 0;

    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    return Math.round((totalSpend / user.monthlyBudget) * 100);
  }

  /**
   * Get total subscription cost per month.
   */
  function getMonthlySubscriptionCost() {
    const subs = DataStore.getSubscriptions().filter(s => s.active);
    return subs.reduce((sum, s) => sum + s.amount, 0);
  }

  /**
   * Get remaining budget.
   */
  function getRemainingBudget() {
    const user = DataStore.getCurrentUser();
    if (!user || !user.monthlyBudget) return 0;

    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    return user.monthlyBudget - totalSpend;
  }

  /**
   * Get daily spending data for the current month (for chart).
   * Returns an array of { day, amount } objects.
   */
  function getDailySpending() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expenses = DataStore.getCurrentMonthExpenses();
    const subs = DataStore.getSubscriptions().filter(s => s.active);

    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayExpenseTotal = expenses
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      // Add subscriptions that bill on this day
      const daySubsTotal = subs
        .filter(s => s.dueDay === d)
        .reduce((sum, s) => sum + s.amount, 0);

      const dayTotal = dayExpenseTotal + daySubsTotal;

      dailyData.push({
        day: d,
        date: dateStr,
        amount: dayTotal,
        isFuture: d > now.getDate(),
      });
    }

    return dailyData;
  }

  /**
   * Get category breakdown for current month.
   * Returns sorted array of { category, amount, percentage }.
   */
  function getCategoryBreakdown() {
    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const subs = DataStore.getSubscriptions().filter(s => s.active);
    const subsTotal = subs.reduce((sum, s) => sum + s.amount, 0);

    if (totalSpend === 0 && subsTotal === 0) return [];

    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    // Group all active subscriptions under the "Subscription" category
    if (subsTotal > 0) {
      categoryTotals['Subscription'] = (categoryTotals['Subscription'] || 0) + subsTotal;
    }

    const totalWithSubs = totalSpend + subsTotal;

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalWithSubs) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get a summary object of all key financial metrics.
   */
  function getSummary() {
    const user = DataStore.getCurrentUser();
    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = user ? user.monthlyBudget : 0;
    const burnRate = getBurnRate();
    const runwayDays = getRunwayDays();
    const subCost = getMonthlySubscriptionCost();
    const subCount = DataStore.getSubscriptions().filter(s => s.active).length;
    const projected = getProjectedMonthlySpend();
    const utilization = getBudgetUtilization();

    return {
      totalSpend,
      budget,
      burnRate,
      runwayDays,
      subCost,
      subCount,
      projected,
      utilization,
      expenseCount: expenses.length,
      // Remaining budget after subtracting BOTH variable expenses and subscriptions
      remaining: budget - (totalSpend + subCost),
    };
  }

  return {
    getBurnRate,
    getRunwayDays,
    getProjectedMonthlySpend,
    getBudgetUtilization,
    getMonthlySubscriptionCost,
    getRemainingBudget,
    getDailySpending,
    getCategoryBreakdown,
    getSummary,
  };
})();