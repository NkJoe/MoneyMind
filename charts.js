/* ============================================
   MoneyMind — Charts Module
   Chart.js integration for dashboard
   visualizations: category pie/doughnut
   and daily spending bar chart.
   ============================================ */

const Charts = (() => {

  let categoryChart = null;
  let dailyChart = null;

  // Chart.js global defaults for dark theme
  function _setDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#a0a0c0';
    Chart.defaults.borderColor = '#2a2a45';
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e1e30';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#a0a0c0';
    Chart.defaults.plugins.tooltip.borderColor = '#2a2a45';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
  }

  /**
   * Render the category breakdown doughnut chart.
   */
  function renderCategoryChart() {
    if (typeof Chart === 'undefined') return;
    _setDefaults();

    const canvas = document.getElementById('chart-categories');
    const emptyEl = document.getElementById('chart-empty');
    if (!canvas) return;

    const breakdown = Predictions.getCategoryBreakdown();

    if (breakdown.length === 0) {
      canvas.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
      }
      return;
    }

    canvas.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = breakdown.map(b => b.category);
    const data = breakdown.map(b => b.amount);
    const colors = breakdown.map(b => DataStore.CATEGORY_COLORS[b.category] || '#94a3b8');

    if (categoryChart) {
      categoryChart.data.labels = labels;
      categoryChart.data.datasets[0].data = data;
      categoryChart.data.datasets[0].backgroundColor = colors;
      categoryChart.update('none');
      return;
    }

    categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverBorderWidth: 2,
          hoverBorderColor: '#ffffff',
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 11, weight: '500' },
              padding: 12,
              generateLabels: function(chart) {
                const data = chart.data;
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const pct = Math.round((value / total) * 100);
                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: 'transparent',
                    lineWidth: 0,
                    pointStyle: 'circle',
                    hidden: false,
                    index: i,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((ctx.parsed / total) * 100);
                return ` ${ctx.label}: ${DataStore.formatCurrency(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          duration: 600,
        },
      },
    });
  }

  /**
   * Render the daily spending bar chart.
   */
  function renderDailyChart() {
    if (typeof Chart === 'undefined') return;
    _setDefaults();

    const canvas = document.getElementById('chart-daily');
    const emptyEl = document.getElementById('chart-daily-empty');
    if (!canvas) return;

    const dailyData = Predictions.getDailySpending();
    const hasData = dailyData.some(d => d.amount > 0);

    if (!hasData) {
      canvas.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      if (dailyChart) {
        dailyChart.destroy();
        dailyChart = null;
      }
      return;
    }

    canvas.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    const now = new Date();
    const todayDay = now.getDate();
    const labels = dailyData.map(d => d.day);
    const amounts = dailyData.map(d => d.amount);
    const burnRate = Predictions.getBurnRate();

    const barColors = dailyData.map(d => {
      if (d.isFuture) return 'rgba(42, 42, 69, 0.3)';
      if (d.amount === 0) return 'rgba(42, 42, 69, 0.5)';
      if (d.amount > burnRate * 2) return 'rgba(255, 77, 106, 0.8)';
      if (d.amount > burnRate * 1.5) return 'rgba(255, 159, 67, 0.8)';
      return 'rgba(0, 200, 150, 0.7)';
    });

    const borderColors = dailyData.map(d => {
      if (d.day === todayDay) return '#ffffff';
      return 'transparent';
    });

    if (dailyChart) {
      dailyChart.data.labels = labels;
      dailyChart.data.datasets[0].data = amounts;
      dailyChart.data.datasets[0].backgroundColor = barColors;
      dailyChart.data.datasets[0].borderColor = borderColors;
      // Update burn rate line
      if (dailyChart.data.datasets[1]) {
        dailyChart.data.datasets[1].data = labels.map(() => burnRate);
      }
      dailyChart.update('none');
      return;
    }

    dailyChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Spend',
            data: amounts,
            backgroundColor: barColors,
            borderColor: borderColors,
            borderWidth: dailyData.map(d => d.day === todayDay ? 2 : 0),
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Avg Burn Rate',
            data: labels.map(() => burnRate),
            type: 'line',
            borderColor: 'rgba(255, 159, 67, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 10 },
              padding: 12,
            },
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                const day = tooltipItems[0].label;
                const now = new Date();
                const date = new Date(now.getFullYear(), now.getMonth(), day);
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              },
              label: function(ctx) {
                if (ctx.datasetIndex === 0) {
                  return ` Spent: ${DataStore.formatCurrency(ctx.parsed.y)}`;
                }
                return ` Avg: ${DataStore.formatCurrency(ctx.parsed.y)}/day`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 9 },
              maxRotation: 0,
              callback: function(val, index) {
                // Show every 5th day + day 1
                const day = this.getLabelForValue(val);
                if (day === 1 || day % 5 === 0) return day;
                return '';
              },
            },
          },
          y: {
            grid: {
              color: 'rgba(42, 42, 69, 0.5)',
            },
            ticks: {
              font: { size: 10 },
              callback: function(value) {
                return DataStore.getCurrencySymbol() + value;
              },
            },
            beginAtZero: true,
          },
        },
        animation: {
          duration: 500,
        },
      },
    });
  }

  /**
   * Render all charts.
   */
  function renderAll() {
    renderCategoryChart();
    renderDailyChart();
  }

  /**
   * Destroy all charts (for cleanup on logout).
   */
  function destroyAll() {
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    if (dailyChart) {
      dailyChart.destroy();
      dailyChart = null;
    }
  }

  return {
    renderCategoryChart,
    renderDailyChart,
    renderAll,
    destroyAll,
  };
})();