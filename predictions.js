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
   * Calculate days until budget runs out at current burn rate.
   * Returns -1 if no budget set or no spending data.
   */
  function getRunwayDays() {
    const user = DataStore.getCurrentUser();
    if (!user || !user.monthlyBudget || user.monthlyBudget <= 0) return -1;

    const expenses = DataStore.getCurrentMonthExpenses();
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = user.monthlyBudget - totalSpend;

    if (remaining <= 0) return 0;

    const burnRate = getBurnRate();
    if (burnRate <= 0) return -1;

    return Math.floor(remaining / burnRate);
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

    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTotal = expenses
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

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

    if (totalSpend === 0) return [];

    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalSpend) * 100),
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
      remaining: budget - totalSpend,
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