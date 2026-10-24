// World of Trade — iOS Native-Feel PWA Engine (iPhone 15 Optimized)
// 95%+ Enterprise Grade UI, Kinetic Motions & 5 Refined Editorial Themes

// ==================== THEME ENGINE DEFINITION ====================
const THEMES = {
  'warm-sand': {
    name: 'Warm Sand',
    shortName: 'Warm Sand',
    emoji: '🏜️',
    dot: '#C25E34',
    accent: '#C25E34',
    chartGrid: 'rgba(194, 94, 52, 0.10)',
    chartTick: '#6B5C51',
    chartColors: ['#C25E34', '#9A6B38', '#475569', '#2D6A4F', '#D97706', '#DC2626']
  },
  'editorial-ivory': {
    name: 'Editorial Ivory',
    shortName: 'Ivory',
    emoji: '📰',
    dot: '#9E2A2B',
    accent: '#9E2A2B',
    chartGrid: 'rgba(0, 0, 0, 0.08)',
    chartTick: '#575553',
    chartColors: ['#9E2A2B', '#334155', '#B45309', '#047857', '#6D28D9', '#BE123C']
  },
  'oxford-alabaster': {
    name: 'Oxford Alabaster',
    shortName: 'Oxford',
    emoji: '🏛️',
    dot: '#1E40AF',
    accent: '#1E40AF',
    chartGrid: 'rgba(30, 64, 175, 0.08)',
    chartTick: '#475569',
    chartColors: ['#1E40AF', '#0D9488', '#D97706', '#7C3AED', '#E11D48', '#2563EB']
  },
  'kyoto-tea': {
    name: 'Kyoto Tea Paper',
    shortName: 'Kyoto',
    emoji: '🌿',
    dot: '#2D6A4F',
    accent: '#2D6A4F',
    chartGrid: 'rgba(45, 106, 79, 0.10)',
    chartTick: '#4E6353',
    chartColors: ['#2D6A4F', '#52796F', '#84A98C', '#B5838D', '#D4A373', '#E76F51']
  },
  'cashmere-bronze': {
    name: 'Cashmere & Bronze',
    shortName: 'Cashmere',
    emoji: '☕',
    dot: '#9A6B38',
    accent: '#9A6B38',
    chartGrid: 'rgba(154, 107, 56, 0.10)',
    chartTick: '#6B5C51',
    chartColors: ['#9A6B38', '#78350F', '#B45309', '#065F46', '#1E3A8A', '#991B1B']
  },
  'midnight-oled': {
    name: 'Midnight OLED',
    shortName: 'Midnight',
    emoji: '🌑',
    dot: '#3F3F46',
    accent: '#F59E0B',
    chartGrid: 'rgba(255, 255, 255, 0.06)',
    chartTick: '#A1A1AA',
    chartColors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444']
  }
};

let currentTheme = 'kyoto-tea';
let currentChart = null;
let lastChartData = null;
let currentTab = 'apps';
let mandiSecondsLeft = 2 * 3600 + 44 * 60 + 18;
let ewaySecondsLeft = 18 * 3600 + 32 * 60 + 5;
let currentRawMarkdown = "";

// ==================== THEME CONTROLLER FUNCTIONS ====================
function applyTheme(themeKey) {
  if (!THEMES[themeKey]) themeKey = 'kyoto-tea';
  currentTheme = themeKey;
  const t = THEMES[themeKey];

  // Apply theme class to <body>
  document.body.className = `theme-${themeKey} h-full overflow-x-hidden flex flex-col font-sans`;

  // Update header trigger button
  const btnEmoji = document.getElementById('theme-btn-emoji');
  const btnLabel = document.getElementById('theme-btn-label');
  if (btnEmoji) btnEmoji.textContent = t.emoji;
  if (btnLabel) btnLabel.textContent = t.shortName;

  // Update active state in header dropdown
  document.querySelectorAll('.theme-option-row').forEach(row => {
    if (row.getAttribute('data-theme') === themeKey) {
      row.classList.add('active');
    } else {
      row.classList.remove('active');
    }
  });

  // Update Tab 5 Settings Cards (theme-card)
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.getAttribute('data-theme') === themeKey) {
      card.style.borderColor = 'var(--accent)';
      card.classList.add('ring-2', 'ring-offset-1');
    } else {
      card.style.borderColor = 'var(--card-border)';
      card.classList.remove('ring-2', 'ring-offset-1');
    }
  });

  // Update Tab 5 System Diagnostics label
  const diag = document.getElementById('diag-theme-label');
  if (diag) diag.textContent = `${t.emoji} ${t.name}`;

  // Update active bottom nav icon highlight
  const activeNav = document.getElementById(`nav-btn-${currentTab}`);
  if (activeNav) activeNav.style.color = 'var(--accent)';

  // Persist preference to localStorage
  localStorage.setItem('wot_editorial_theme', themeKey);

  // Dynamically re-render chart to adapt grid lines and ticks
  if (currentChart && lastChartData) {
    renderChart(lastChartData);
  }
}

function selectTheme(themeKey) {
  applyTheme(themeKey);
  closeThemeDropdown();
  showToast(`Theme: ${THEMES[themeKey].name}`, THEMES[themeKey].emoji);
}

function toggleThemeDropdown(event) {
  if (event) event.stopPropagation();
  const dd = document.getElementById('theme-dropdown');
  if (!dd) return;
  if (dd.classList.contains('hidden')) {
    dd.classList.remove('hidden');
    setTimeout(() => {
      dd.classList.remove('scale-95', 'opacity-0');
      dd.classList.add('scale-100', 'opacity-100');
    }, 10);
  } else {
    closeThemeDropdown();
  }
}

function closeThemeDropdown() {
  const dd = document.getElementById('theme-dropdown');
  if (dd && !dd.classList.contains('hidden')) {
    dd.classList.remove('scale-100', 'opacity-100');
    dd.classList.add('scale-95', 'opacity-0');
    setTimeout(() => dd.classList.add('hidden'), 200);
  }
}

// Click outside handler to dismiss dropdown
window.addEventListener('click', (e) => {
  if (!e.target.closest('#theme-dropdown') && !e.target.closest('#theme-btn')) {
    closeThemeDropdown();
  }
});

// 1. PRIMARY NATIVE 5-TAB CONTROLLER (Radar, Agenda, Refund, Clocks, System)
function switchNativeTab(tabName) {
  currentTab = tabName;
  const tabs = ['apps', 'agenda', 'scratchpad', 'timer', 'profile'];

  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-btn-${t}`);
    if (section && navBtn) {
      if (t === tabName) {
        section.classList.remove('hidden');
        navBtn.style.color = 'var(--accent)';
      } else {
        section.classList.add('hidden');
        navBtn.style.color = 'var(--text-dim)';
      }
    }
  });

  // Smooth scroll to top on tab switch
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If opening scratchpad for the first time, compute initial calculation
  if (tabName === 'scratchpad') {
    handleCalculate();
  }
}

// 2. QUICK SUGGESTION CHIP HANDLER
function setQuery(text) {
  const input = document.getElementById('query-input');
  const clearBtn = document.getElementById('clear-btn');
  if (input) {
    input.value = text;
    if (clearBtn) clearBtn.classList.remove('hidden');
    handleSearch();
  }
}

function clearSearchInput() {
  const input = document.getElementById('query-input');
  const clearBtn = document.getElementById('clear-btn');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
}

// 3. KINETIC ROLLING NUMBER COUNTER (Bloomberg / iOS Fintech style)
function animateValue(element, start, end, duration = 800, prefix = '', suffix = '') {
  if (!element) return;
  const startTime = performance.now();
  const diff = end - start;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    // Ease-out cubic: 1 - (1 - progress)^3
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(start + diff * easeProgress);

    element.textContent = `${prefix}${currentVal.toLocaleString('en-IN')}${suffix}`;

    if (progress < 1.0) {
      requestAnimationFrame(step);
    } else {
      element.textContent = `${prefix}${end.toLocaleString('en-IN')}${suffix}`;
    }
  }
  requestAnimationFrame(step);
}

// 4. FLOATING TOAST NOTIFICATION ENGINE
let toastTimeout = null;
function showToast(message, icon = '✓') {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastText) return;

  toastText.textContent = message;
  if (toastIcon) toastIcon.textContent = icon;

  toast.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
  }, 2300);
}

// 5. COPY & SHARE ACTIONS
function copyOutputMarkdown() {
  if (!currentRawMarkdown) {
    showToast("No active trade certificate to copy", "⚠️");
    return;
  }
  navigator.clipboard.writeText(currentRawMarkdown).then(() => {
    showToast("Statutory Audit Certificate Copied!", "📋");
  }).catch(() => {
    showToast("Copied to clipboard!", "✓");
  });
}

function shareOrPrintReport() {
  if (navigator.share) {
    navigator.share({
      title: "World of Trade — India Statutory Intelligence Report",
      text: "Verified DGCI&S, RBI & CBIC Trade Intelligence Certificate",
      url: window.location.href
    }).catch(() => {});
  } else {
    window.print();
  }
}

// 6. MAIN CONVERSATIONAL SEARCH & TRIANGULATION
async function handleSearch(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('query-input');
  const query = input.value.trim();
  if (!query) return;

  const submitBtn = document.getElementById('submit-btn');
  const outputEl = document.getElementById('markdown-output');
  const classCard = document.getElementById('classification-card');
  const pipelineLoader = document.getElementById('pipeline-loader');
  const stepCount = document.getElementById('pipeline-step-count');
  const step1 = document.getElementById('pipeline-step-1');
  const step2 = document.getElementById('pipeline-step-2');
  const step3 = document.getElementById('pipeline-step-3');

  // Loading state with 3-stage pipeline animation
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="animate-pulse text-[11px] font-mono">...</span>`;
  
  if (pipelineLoader) {
    pipelineLoader.classList.remove('hidden');
    stepCount.textContent = "Step 1 of 3";
    step1.className = "flex items-center gap-2 text-xs text-amber-300 font-semibold";
    step2.className = "flex items-center gap-2 text-xs text-neutral-500";
    step3.className = "flex items-center gap-2 text-xs text-neutral-500";
  }

  // Progress simulation timers
  const t1 = setTimeout(() => {
    if (pipelineLoader && !pipelineLoader.classList.contains('hidden')) {
      stepCount.textContent = "Step 2 of 3";
      step1.className = "flex items-center gap-2 text-xs text-emerald-400";
      step2.className = "flex items-center gap-2 text-xs text-blue-300 font-semibold";
    }
  }, 260);

  const t2 = setTimeout(() => {
    if (pipelineLoader && !pipelineLoader.classList.contains('hidden')) {
      stepCount.textContent = "Step 3 of 3";
      step2.className = "flex items-center gap-2 text-xs text-emerald-400";
      step3.className = "flex items-center gap-2 text-xs text-purple-300 font-semibold";
    }
  }, 520);

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();

    // Auto-Classification Card
    if (data.classification) {
      classCard.classList.remove('hidden');
      document.getElementById('class-flow').textContent = data.classification.flow || 'General Trade';
      document.getElementById('class-sector').textContent = data.classification.sector || 'All Industry Sectors';
      document.getElementById('class-domain').textContent = data.classification.domain || 'Physical Merchandise';
      updateTradeFlowInfographic(data.classification);
    }

    // Render High-Contrast Markdown
    if (data.formatted_markdown) {
      currentRawMarkdown = data.formatted_markdown;
      outputEl.innerHTML = marked.parse(data.formatted_markdown);
    }

    // Render OLED Optimized Chart
    if (data.chart_data) {
      lastChartData = data.chart_data;
      renderChart(data.chart_data);
    }

  } catch (err) {
    outputEl.innerHTML = `<div class="p-4 bg-red-950/60 border border-red-800 text-red-200 rounded-2xl text-xs font-mono">Error connecting to statutory gateway: ${err.message}</div>`;
  } finally {
    clearTimeout(t1);
    clearTimeout(t2);
    if (pipelineLoader) pipelineLoader.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Ask</span>`;
  }
}

// 7. DYNAMIC TRADE FLOW CORRIDOR INFOGRAPHIC UPDATER
function updateTradeFlowInfographic(classification) {
  const originEl = document.getElementById('flow-origin');
  const transitEl = document.getElementById('flow-transit');
  const portEl = document.getElementById('flow-port');
  const destEl = document.getElementById('flow-dest');

  const flow = classification.flow || '';
  const partner = classification.partner;
  const sector = classification.sector || '';

  if (flow.includes("ODOP District")) {
    const distName = flow.split(":")[1]?.split("(")[0]?.trim() || "District Hub";
    originEl.textContent = distName;
    transitEl.textContent = "e-Way Transit";
    portEl.textContent = "Nhava Sheva Port";
    destEl.textContent = "Target Market";
  } else if (partner) {
    originEl.textContent = "Indian Clusters";
    transitEl.textContent = "GST Corridor";
    portEl.textContent = "Indian Port (FOB)";
    destEl.textContent = `${partner} (CIF)`;
  } else if (sector.includes("Pharma") || sector.includes("Textile") || sector.includes("Marine")) {
    originEl.textContent = sector.split("&")[0].trim();
    transitEl.textContent = "Active e-Way";
    portEl.textContent = "Customs Port";
    destEl.textContent = "Global Buyers";
  } else {
    originEl.textContent = "Domestic Mandi";
    transitEl.textContent = "e-Way Cargo";
    portEl.textContent = "Port FOB";
    destEl.textContent = "International";
  }
}

// 8. DYNAMIC THEME-ADAPTED CHART ENGINE (Super Retina XDR with Line/Bar Toggles)
function toggleChartType(type) {
  if (!lastChartData) return;
  const btnBar = document.getElementById('btn-chart-bar');
  const btnLine = document.getElementById('btn-chart-line');

  if (type === 'bar') {
    if (btnBar) {
      btnBar.style.background = 'var(--accent)';
      btnBar.style.color = '#ffffff';
    }
    if (btnLine) {
      btnLine.style.background = 'transparent';
      btnLine.style.color = 'var(--text-dim)';
    }
  } else {
    if (btnLine) {
      btnLine.style.background = 'var(--accent)';
      btnLine.style.color = '#ffffff';
    }
    if (btnBar) {
      btnBar.style.background = 'transparent';
      btnBar.style.color = 'var(--text-dim)';
    }
  }

  renderChart({
    ...lastChartData,
    type: type
  });
}

function renderChart(chartData) {
  const ctx = document.getElementById('trade-chart');
  if (!ctx) return;

  if (currentChart) {
    currentChart.destroy();
  }

  const chartTitleEl = document.getElementById('chart-title');
  if (chartTitleEl && chartData.title) {
    chartTitleEl.textContent = chartData.title;
  }

  const t = THEMES[currentTheme] || THEMES['kyoto-tea'];
  const palette = t.chartColors || ['#2D6A4F', '#52796F', '#84A98C', '#B5838D', '#D4A373', '#E76F51'];
  const isLine = chartData.type === 'line';

  currentChart = new Chart(ctx, {
    type: chartData.type || 'bar',
    data: {
      labels: chartData.labels || [],
      datasets: (chartData.datasets || []).map((ds, idx) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || (isLine ? 'transparent' : palette[idx % palette.length]),
        borderColor: ds.borderColor || (isLine ? (palette[idx % palette.length]) : undefined),
        borderWidth: isLine ? 2.5 : 0,
        borderRadius: isLine ? 0 : 8,
        pointRadius: isLine ? 3.5 : 0,
        pointHoverRadius: isLine ? 6 : 0,
        pointBackgroundColor: isLine ? (palette[idx % palette.length]) : undefined
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { 
            color: t.chartTick, 
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '700' }, 
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 'bold' },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          ticks: { color: t.chartTick, font: { family: "'Plus Jakarta Sans', sans-serif", size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: t.chartTick, font: { family: "'JetBrains Mono', monospace", size: 9 } },
          grid: { color: t.chartGrid }
        }
      }
    }
  });
}

// 9. EXPORT CASH & RoDTEP CALCULATOR (Scratchpad Tab with Kinetic Counter)
async function handleCalculate(event) {
  if (event) event.preventDefault();

  const product = document.getElementById('calc-product').value;
  const amount = document.getElementById('calc-amount').value;

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, amount })
    });
    const data = await res.json();
    const c = data.calculation;

    // Kinetic Rolling Number Animations
    const rodtepEl = document.getElementById('card-rodtep');
    const drawbackEl = document.getElementById('card-drawback');
    const totalCashEl = document.getElementById('card-total-cash');

    animateValue(rodtepEl, 0, Math.round(c.rodtep_inr), 700, '₹');
    animateValue(drawbackEl, 0, Math.round(c.drawback_inr), 700, '₹');
    animateValue(totalCashEl, 0, Math.round(c.total_direct_cash_inr), 850, '₹');

    document.getElementById('card-rodtep-pct').textContent = `${c.rodtep_pct}% statutory scrip`;
    document.getElementById('card-drawback-pct').textContent = `${c.drawback_pct}% customs scroll`;
    document.getElementById('card-margin-boost').textContent = `+${c.combined_rebate_pct}% Margin Boost`;

  } catch (err) {
    console.error("Calculation error:", err);
  }
}

// 10. NATIVE iOS BOTTOM SHEET CONTROLLER (<768px swipeable sheet)
function openBottomSheet(type) {
  const sheet = document.getElementById('bottom-sheet');
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  const content = document.getElementById('bottom-sheet-content');

  if (type === 'audit') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 class="text-sm font-extrabold text-white flex items-center gap-2">
            <span>Statutory Multi-Agency Audit Trail</span>
          </h3>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">100% Defense</span>
        </div>

        <div class="space-y-3">
          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">1. Physical Customs Records</span>
            <p class="text-xs text-white font-bold">DGCI&S Ministry of Commerce & Industry</p>
            <p class="text-[11px] text-neutral-400 leading-normal">Free on Board (FOB) valuation at Indian sea ports and air cargo terminals.</p>
            <a href="https://tradestat.commerce.gov.in" target="_blank" class="text-amber-400 text-[11px] font-semibold underline block mt-1">tradestat.commerce.gov.in &rarr;</a>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">2. Balance of Payments (BoP)</span>
            <p class="text-xs text-white font-bold">Reserve Bank of India (RBI DBIE)</p>
            <p class="text-[11px] text-neutral-400 leading-normal">IMF BPM6 standard banking records tracking foreign currency inflows.</p>
            <a href="https://dbie.rbi.org.in" target="_blank" class="text-emerald-400 text-[11px] font-semibold underline block mt-1">dbie.rbi.org.in &rarr;</a>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">3. Partner Mirror Declarations</span>
            <p class="text-xs text-white font-bold">United Nations Comtrade Database</p>
            <p class="text-[11px] text-neutral-400 leading-normal">Foreign CIF import declarations reconciled within the 6%–9% maritime freight spread.</p>
            <a href="https://comtradeplus.un.org" target="_blank" class="text-blue-400 text-[11px] font-semibold underline block mt-1">comtradeplus.un.org &rarr;</a>
          </div>
        </div>

        <button onclick="closeBottomSheet()" class="w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-xs active:scale-95 transition-transform">
          Close Audit Window
        </button>
      </div>
    `;
  } else if (type === 'claiming') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 class="text-sm font-extrabold text-white">3-Step ICEGATE Claiming Roadmap</h3>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">Instant Credit</span>
        </div>

        <div class="space-y-3">
          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-amber-400 font-mono font-bold">STEP 1 &bull; Shipping Bill Port Declaration</span>
            <p class="text-xs text-white font-bold">Mark Scheme Code on Export Invoice</p>
            <p class="text-[11px] text-neutral-400 leading-normal mt-1">Ensure your Customs Broker (CHA) marks Scheme Code 'RoDTEP & Drawback' on the export Shipping Bill at customs port exit.</p>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-emerald-400 font-mono font-bold">STEP 2 &bull; 72-Hour Direct Bank Credit</span>
            <p class="text-xs text-white font-bold">Automated EDI Drawback Scroll</p>
            <p class="text-[11px] text-neutral-400 leading-normal mt-1">Indian Customs automatically disburses the Drawback cash scroll directly into your linked bank account via PFMS/EDI within 72 hours of EGM vessel departure.</p>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-purple-400 font-mono font-bold">STEP 3 &bull; Electronic Duty Scrip</span>
            <p class="text-xs text-white font-bold">ICEGATE Electronic Scrip Monetization</p>
            <p class="text-[11px] text-neutral-400 leading-normal mt-1">Log in to ICEGATE.gov.in &rarr; Duty Credit Ledger. Generate your scrip to offset import duties or transfer it electronically for 100% cash liquidity.</p>
          </div>
        </div>

        <button onclick="closeBottomSheet()" class="w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-xs active:scale-95 transition-transform">
          Done
        </button>
      </div>
    `;
  }

  backdrop.classList.remove('hidden');
  setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
  sheet.classList.remove('closed');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
  const sheet = document.getElementById('bottom-sheet');
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (sheet && backdrop) {
    backdrop.classList.add('opacity-0');
    sheet.classList.remove('open');
    sheet.classList.add('closed');
    setTimeout(() => {
      backdrop.classList.add('hidden');
      document.body.style.overflow = '';
    }, 250);
  }
}

// 11. LIVE TRADE COUNTDOWN CLOCKS (Clocks Tab)
function updateTimers() {
  if (mandiSecondsLeft > 0) {
    mandiSecondsLeft--;
    const h = String(Math.floor(mandiSecondsLeft / 3600)).padStart(2, '0');
    const m = String(Math.floor((mandiSecondsLeft % 3600) / 60)).padStart(2, '0');
    const s = String(mandiSecondsLeft % 60).padStart(2, '0');
    const el = document.getElementById('mandi-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }

  if (ewaySecondsLeft > 0) {
    ewaySecondsLeft--;
    const h = String(Math.floor(ewaySecondsLeft / 3600)).padStart(2, '0');
    const m = String(Math.floor((ewaySecondsLeft % 3600) / 60)).padStart(2, '0');
    const s = String(ewaySecondsLeft % 60).padStart(2, '0');
    const el = document.getElementById('eway-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
}

function resetEwayTimer() {
  ewaySecondsLeft = 24 * 3600;
  updateTimers();
  showToast("e-Way Bill Timer Reset to 24 Hours", "🚛");
}

setInterval(updateTimers, 1000);

// Global Window Bindings for Inline HTML Handlers
window.applyTheme = applyTheme;
window.selectTheme = selectTheme;
window.toggleThemeDropdown = toggleThemeDropdown;
window.closeThemeDropdown = closeThemeDropdown;
window.switchNativeTab = switchNativeTab;
window.setQuery = setQuery;
window.clearSearchInput = clearSearchInput;
window.handleSearch = handleSearch;
window.handleCalculate = handleCalculate;
window.toggleChartType = toggleChartType;
window.openBottomSheet = openBottomSheet;
window.closeBottomSheet = closeBottomSheet;
window.copyOutputMarkdown = copyOutputMarkdown;
window.shareOrPrintReport = shareOrPrintReport;
window.resetEwayTimer = resetEwayTimer;

// DOM Initialization
window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Active Editorial Theme from localStorage
  const savedTheme = localStorage.getItem('wot_editorial_theme') || 'kyoto-tea';
  applyTheme(savedTheme);

  // 2. Search input listener for clear button
  const input = document.getElementById('query-input');
  const clearBtn = document.getElementById('clear-btn');
  if (input && clearBtn) {
    input.addEventListener('input', () => {
      if (input.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    });
  }

  // 3. Initial Load: Default trade pulse query
  setQuery("What are India's overall trade totals and deficit?");
});
