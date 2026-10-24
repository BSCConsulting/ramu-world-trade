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
let currentDealMemo = null;
let activeEntityCategory = 'all';

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

// ==================== SECURITY: HTML ESCAPING & DOM SANITIZATION ====================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeHtml(dirty) {
  if (!dirty) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirty, 'text/html');
    
    // Remove active script and embedding tags
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link', 'style', 'input', 'textarea', 'button'];
    dangerousTags.forEach(tag => {
      doc.body.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Strip inline event listeners (on*) and javascript: / data: protocols
    const allEls = doc.body.querySelectorAll('*');
    allEls.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value.toLowerCase().trim();
        if (attrName.startsWith('on') || attrVal.startsWith('javascript:') || attrVal.startsWith('vbscript:') || attrVal.startsWith('data:text/html')) {
          el.removeAttribute(attr.name);
        }
      });
      // Enforce rel="noopener noreferrer" and protocol safety on links
      if (el.tagName === 'A') {
        const href = (el.getAttribute('href') || '').toLowerCase().trim();
        if (href.startsWith('javascript:') || href.startsWith('data:')) {
          el.removeAttribute('href');
        }
        if (el.getAttribute('target') === '_blank') {
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });

    return doc.body.innerHTML;
  } catch (e) {
    return escapeHtml(dirty);
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

    // Auto-Classification Card & Duty Tree
    if (data.classification) {
      classCard.classList.remove('hidden');
      document.getElementById('class-flow').textContent = data.classification.flow || 'General Trade';
      document.getElementById('class-sector').textContent = data.classification.sector || 'All Industry Sectors';
      document.getElementById('class-domain').textContent = data.classification.domain || 'Physical Merchandise';
      updateTradeFlowInfographic(data.classification);

      // Duty Tree & Regulatory Alert
      const sector = (data.classification.sector || '').toLowerCase();
      const dutyRates = document.getElementById('duty-tree-rates');
      const dutyDwell = document.getElementById('duty-dwell-time');
      const dutySps = document.getElementById('duty-sps-alert');

      if (sector.includes('textile') || sector.includes('apparel') || sector.includes('cotton')) {
        if (dutyRates) dutyRates.textContent = 'BCD 10% • SWS 1% • IGST 12% (RoSCTL 3.9%)';
        if (dutyDwell) dutyDwell.textContent = 'JNPT: 22h • Chennai Port: 26h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> EU REACH Annex XVII Azo-dye & Oeko-Tex Class 1 testing mandatory.';
      } else if (sector.includes('marine') || sector.includes('shrimp')) {
        if (dutyRates) dutyRates.textContent = 'BCD 30% • SWS 3% • IGST 5% (RoDTEP 2.5%)';
        if (dutyDwell) dutyDwell.textContent = 'Vizag Port: 18h • JNPT Reefer: 20h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> US FDA Chloramphenicol zero-tolerance & EU EIC health certificate required.';
      } else if (sector.includes('spice') || sector.includes('turmeric')) {
        if (dutyRates) dutyRates.textContent = 'BCD 30% • SWS 3% • IGST 5% (RoDTEP 1.5%)';
        if (dutyDwell) dutyDwell.textContent = 'Chennai Port: 28h • JNPT: 22h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> EU Aflatoxin <5ppb & Sudan Dye absence certificate required.';
      } else if (sector.includes('engineer') || sector.includes('steel') || sector.includes('fastener')) {
        if (dutyRates) dutyRates.textContent = 'BCD 7.5% • SWS 0.75% • IGST 18% (RoDTEP 1.4%)';
        if (dutyDwell) dutyDwell.textContent = 'Mundra: 16h • Pipavav: 15h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> EU CBAM (Carbon Border Adjustment) embedded emissions filing mandatory.';
      } else if (sector.includes('pharma') || sector.includes('medicine')) {
        if (dutyRates) dutyRates.textContent = 'BCD 10% • SWS 1% • IGST 12% (RoDTEP 1.0%)';
        if (dutyDwell) dutyDwell.textContent = 'Air Cargo Terminal: 12h • JNPT: 22h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> WHO-GMP Certificate of Pharmaceutical Product (CoPP) required.';
      } else {
        if (dutyRates) dutyRates.textContent = 'BCD 10% • SWS 1% • IGST 18% (Standard Air/Sea Rate)';
        if (dutyDwell) dutyDwell.textContent = 'JNPT (Nhava Sheva): 22h • Mundra: 16h';
        if (dutySps) dutySps.innerHTML = '⚠️ <strong>SPS / TBT Alert:</strong> Verified Gross Mass (VGM) container weight declaration mandatory.';
      }
    }

    // Render Sanitized High-Contrast Markdown (XSS Hardened)
    if (data.formatted_markdown) {
      currentRawMarkdown = data.formatted_markdown;
      outputEl.innerHTML = sanitizeHtml(marked.parse(data.formatted_markdown));
    }

    // Render OLED Optimized Chart
    if (data.chart_data) {
      lastChartData = data.chart_data;
      renderChart(data.chart_data);
    }

  } catch (err) {
    outputEl.innerHTML = `<div class="p-4 bg-red-950/60 border border-red-800 text-red-200 rounded-2xl text-xs font-mono">Error connecting to statutory gateway: ${escapeHtml(err.message)}</div>`;
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

  const product = document.getElementById('calc-product')?.value || '';
  const amount = document.getElementById('calc-amount')?.value || '50000 USD';
  const quantity = parseFloat(document.getElementById('calc-quantity')?.value) || 10000;
  const unit = document.getElementById('calc-unit')?.value || 'pcs';

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, amount, quantity, unit })
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

    const schemeTypeEl = document.getElementById('card-scheme-type');
    if (schemeTypeEl) schemeTypeEl.textContent = (c.scheme_name || 'RoDTEP') + ' Scrip';

    document.getElementById('card-rodtep-pct').textContent = `${c.rodtep_pct}% statutory ${c.scheme_name || 'scrip'}`;
    document.getElementById('card-drawback-pct').textContent = `${c.drawback_pct}% customs scroll`;
    document.getElementById('card-margin-boost').textContent = `+${c.combined_rebate_pct}% Margin Boost`;

    // Statutory Cap Alert Pill
    const capAlert = document.getElementById('card-cap-alert');
    const capCeilingEl = document.getElementById('card-cap-ceiling');
    if (capAlert) {
      if (c.is_capped) {
        capAlert.classList.remove('hidden');
        if (capCeilingEl) capCeilingEl.textContent = `₹${Math.round(c.cap_ceiling).toLocaleString('en-IN')} Cap Enforced`;
      } else {
        capAlert.classList.add('hidden');
      }
    }

    // Secondary Scrip Net Cash & Advance Auth
    const scripNetEl = document.getElementById('card-scrip-net');
    const aaEl = document.getElementById('card-aa-savings');
    if (scripNetEl) scripNetEl.textContent = `₹${Math.round(c.scrip_net_cash_inr || 0).toLocaleString('en-IN')}`;
    if (aaEl) aaEl.textContent = `₹${Math.round(c.advance_auth_saving_inr || 0).toLocaleString('en-IN')}`;

    // Commercial Deal Memo capture & preview update
    if (c.commercial_deal_memo) {
      currentDealMemo = c.commercial_deal_memo;
      const memoProfitEl = document.getElementById('memo-preview-profit');
      const memoCreditEl = document.getElementById('memo-preview-credit');
      if (memoProfitEl) memoProfitEl.textContent = `₹${Math.round(currentDealMemo.net_commercial_profit_inr).toLocaleString('en-IN')}`;
      if (memoCreditEl) memoCreditEl.textContent = `₹${Math.round(currentDealMemo.bank_packing_credit_inr).toLocaleString('en-IN')}`;
    }

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
            <a href="https://tradestat.commerce.gov.in" target="_blank" rel="noopener noreferrer" class="text-amber-400 text-[11px] font-semibold underline block mt-1">tradestat.commerce.gov.in &rarr;</a>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">2. Balance of Payments (BoP)</span>
            <p class="text-xs text-white font-bold">Reserve Bank of India (RBI DBIE)</p>
            <p class="text-[11px] text-neutral-400 leading-normal">IMF BPM6 standard banking records tracking foreign currency inflows.</p>
            <a href="https://dbie.rbi.org.in" target="_blank" rel="noopener noreferrer" class="text-emerald-400 text-[11px] font-semibold underline block mt-1">dbie.rbi.org.in &rarr;</a>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">3. Partner Mirror Declarations</span>
            <p class="text-xs text-white font-bold">United Nations Comtrade Database</p>
            <p class="text-[11px] text-neutral-400 leading-normal">Foreign CIF import declarations reconciled within the 6%–9% maritime freight spread.</p>
            <a href="https://comtradeplus.un.org" target="_blank" rel="noopener noreferrer" class="text-blue-400 text-[11px] font-semibold underline block mt-1">comtradeplus.un.org &rarr;</a>
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
let gateSecondsLeft = 6 * 3600 + 14 * 60 + 22;

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

  if (gateSecondsLeft > 0) {
    gateSecondsLeft--;
    const h = String(Math.floor(gateSecondsLeft / 3600)).padStart(2, '0');
    const m = String(Math.floor((gateSecondsLeft % 3600) / 60)).padStart(2, '0');
    const s = String(gateSecondsLeft % 60).padStart(2, '0');
    const el = document.getElementById('gate-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
}

function resetEwayTimer() {
  ewaySecondsLeft = 24 * 3600;
  updateTimers();
  showToast("e-Way Bill Timer Reset to 24 Hours", "🚛");
}

setInterval(updateTimers, 1000);

// 12. 8-DIGIT ITC-HS TARIFF SELECTOR
function setHsTariff(hsCode) {
  const map = {
    '6109.10.00': "Tell me about 8-digit ITC-HS 6109 10 00 Cotton T-Shirts export tariff and RoSCTL incentives",
    '0306.17.20': "Tell me about 8-digit ITC-HS 0306 17 20 Frozen Marine Shrimp export tariff and RoDTEP incentives",
    '0910.30.20': "Tell me about 8-digit ITC-HS 0910 30 20 Turmeric Powder export tariff and RoDTEP incentives",
    '7318.15.00': "Tell me about 8-digit ITC-HS 7318 15 00 Steel Fasteners and Machinery Bolts export tariff",
    '7418.10.22': "Tell me about 8-digit ITC-HS 7418 10 22 Brassware Handicrafts export tariff and Drawback",
    '6403.91.90': "Tell me about 8-digit ITC-HS 6403 91 90 Leather Footwear export tariff and Drawback",
    '3004.90.99': "Tell me about 8-digit ITC-HS 3004 90 99 Pharmaceutical Formulations export tariff",
    '8517.13.00': "Tell me about 8-digit ITC-HS 8517 13 00 Smartphones and Electronics export tariff"
  };
  setQuery(map[hsCode] || `Tell me about 8-digit ITC-HS ${hsCode}`);
}

// 13. ICEGATE ERROR CODE DECODER
const ICEGATE_ERRORS = {
  'SB001': {
    title: 'SB001 — Invalid IEC / PAN Mismatch',
    severity: 'Critical (Blocks Scroll)',
    color: '#EF4444',
    cause: 'The Importer Exporter Code (IEC) or PAN declared in the Shipping Bill does not match DGFT/ICEGATE central registry.',
    resolution: '1. Log in to dgft.gov.in and verify IEC status is "Active".\n2. Verify PAN is correctly linked in ICEGATE profile under User Management.\n3. Request CHA to file amendment for re-transmitting the Shipping Bill.'
  },
  'SB002': {
    title: 'SB002 — Bank PFMS Name Mismatch',
    severity: 'Drawback Stalled',
    color: '#EF4444',
    cause: 'Exporter registered business name on the Shipping Bill does not match beneficiary account holder name verified by PFMS.',
    resolution: '1. Log in to ICEGATE -> Financial Services -> Bank Account Management.\n2. Execute "Single Rupee Test Credit" verification.\n3. Submit revised bank mandate letter to Assistant Commissioner (Drawback) at port of export.'
  },
  'SB003': {
    title: 'SB003 — GSTR-1 Table 6A Invoice Mismatch',
    severity: 'Blocks IGST Refund',
    color: '#F59E0B',
    cause: 'Invoice number or date declared in Table 6A of GSTR-1 does not match line-by-line with the export invoice declared on the Shipping Bill.',
    resolution: '1. Check Table 6A of GSTR-1 on gst.gov.in.\n2. Ensure Shipping Bill number, Port Code (e.g. INNSA1), and Invoice Number match exactly without extra spaces or slashes.\n3. File Table 9 amendment in next GSTR-1 return if mistyped.'
  },
  'SB005': {
    title: 'SB005 — EGM Error / Container Not Integrated',
    severity: 'Scroll Cannot Be Generated',
    color: '#EF4444',
    cause: 'Vessel or airline has departed, but the shipping line has not filed the EGM with customs, or container number differs between Shipping Bill and EGM.',
    resolution: '1. Contact shipping line / carrier agent immediately.\n2. Request them to file an EGM Amendment (Form B) with customs port container cell.\n3. Re-verify physical container number and seal number.'
  },
  'SB006': {
    title: 'SB006 — Gateway Port Mismatch (Transshipment)',
    severity: 'Stalls Drawback Scroll',
    color: '#F59E0B',
    cause: 'For inland container depots (ICD), the gateway exit seaport declared on the Train Summary Manifest (TSM) does not match actual seaport exit.',
    resolution: '1. Track transshipment permit from origin ICD to gateway port (e.g. ICD Ludhiana to Mundra).\n2. Submit Transshipment Manifest confirmation to ICD Customs Superintendent to update the gateway exit record.'
  },
  'ERR-301': {
    title: 'ERR-301 — RoDTEP Scheme Code Not Claimed',
    severity: 'Zero RoDTEP Credit',
    color: '#EF4444',
    cause: 'Item-level scheme code "RDTP" or "RODTEP" was left blank on the export Shipping Bill line item by the customs broker (CHA).',
    resolution: '1. Section 149 customs amendment must be filed with the Deputy Commissioner of Customs at port of export before LEO (Let Export Order) is issued.\n2. Post-LEO amendments require formal Commissioner approval.'
  }
};

function decodeIcegateError(code) {
  const err = ICEGATE_ERRORS[code];
  if (!err) return;
  const titleEl = document.getElementById('err-code-title');
  const sevEl = document.getElementById('err-severity');
  const causeEl = document.getElementById('err-cause');
  const resEl = document.getElementById('err-resolution');
  
  if (titleEl) titleEl.textContent = err.title;
  if (sevEl) {
    sevEl.textContent = err.severity;
    sevEl.style.color = err.color;
  }
  if (causeEl) causeEl.textContent = err.cause;
  if (resEl) resEl.innerHTML = err.resolution.replace(/\n/g, '<br>');
  showToast(`Decoded ${code}`, "⚡");
}

// 14. FTA CERTIFICATE OF ORIGIN (CoO) SIMULATOR
function calculateFtaValueAddition() {
  const imp = parseFloat(document.getElementById('fta-import-val')?.value) || 0;
  const exp = parseFloat(document.getElementById('fta-export-val')?.value) || 1;
  const dva = Math.max(0, Math.min(100, Math.round(((exp - imp) / exp) * 1000) / 10));
  
  const dvaEl = document.getElementById('fta-dva-pct');
  const statusEl = document.getElementById('fta-coo-status');
  
  if (dvaEl) {
    dvaEl.textContent = `${dva}% DVA`;
    dvaEl.style.color = dva >= 35 ? '#10B981' : '#EF4444';
  }
  if (statusEl) {
    if (dva >= 35) {
      statusEl.textContent = "✓ QUALIFIES FOR 0% DUTY";
      statusEl.style.background = "rgba(16, 185, 129, 0.15)";
      statusEl.style.color = "#10B981";
    } else {
      statusEl.textContent = "✗ BELOW 35% THRESHOLD";
      statusEl.style.background = "rgba(239, 68, 68, 0.15)";
      statusEl.style.color = "#EF4444";
    }
  }
}

// 15. RULE 138(10) BREAKDOWN NOTICE GENERATOR
function copyBreakdownNotice() {
  const now = new Date();
  const notice = `STATUTORY NOTICE UNDER CGST RULE 138(10) — TRANSIT EXTENSION\nDate: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')} IST\nVehicle: NL-01-AF-4421 | Consignment: Commercial Export Freight\nStatutory Reason: Mechanical breakdown of commercial heavy vehicle en-route to Gateway Port.\nLegal Relief: Application filed within mandatory 16-hour validity window (Rule 138(10) of Central Goods and Services Tax Rules, 2017).\nTarget Gateway Seaport: Nhava Sheva (JNPT) / Mundra Container Terminal.`;
  navigator.clipboard.writeText(notice).then(() => {
    showToast("Breakdown Notice Copied to Clipboard!", "📋");
  }).catch(() => {
    showToast("Notice text ready to copy", "✓");
  });
}

// 16. ODOP DISTRICT SOURCING DEEP-DIVE
const ODOP_DEEP_DIVE_DATA = {
  'Nizamabad': {
    name: 'Nizamabad, Telangana',
    product: 'Turmeric & Turmeric Formulations (HS 0910 30 20)',
    gi: 'GI-Application 627 (Class 30 - Agri)',
    season: 'Peak: Jan - Apr | Moderate: May - Jul | Lean: Aug - Dec',
    icd: 'ICD Sanathnagar / Hyderabad (CONCOR Railhead)',
    freight: '₹32,400 per TEU to JNPT Port (FOB)',
    lab: 'Spices Board Quality Evaluation Lab, Hyderabad (NABL TC-5421)'
  },
  'Guntur': {
    name: 'Guntur, Andhra Pradesh',
    product: 'Dried Red Chillies (Teja & Sannam varieties - HS 0904)',
    gi: 'GI-Reg 429 (Guntur Sannam Chilli - Class 30)',
    season: 'Peak: Feb - May | Moderate: Jun - Aug | Lean: Sep - Jan',
    icd: 'ICD Guntur (Reddipalem / Marripalem)',
    freight: '₹24,500 per TEU to Krishnapatnam / Chennai Port',
    lab: 'Vimta Labs Ltd / Spices Board Regional Lab, Guntur'
  },
  'Tirupur': {
    name: 'Tirupur, Tamil Nadu',
    product: 'Cotton Knitwear & Readymade Garments (HS 6109 10 00)',
    gi: 'Industrial Knitwear Cluster TN-TRP-01',
    season: 'Continuous Industrial Production (Summer & Autumn Lines)',
    icd: 'ICD Tirupur (Irugur / Chettipalayam CONCOR)',
    freight: '₹19,500 per TEU to Cochin / Tuticorin Port',
    lab: 'SGS India / Intertek / Bureau Veritas Tirupur Hubs'
  },
  'Moradabad': {
    name: 'Moradabad, Uttar Pradesh',
    product: 'Artistic Metal Brassware & Handicrafts (HS 7418 10 22)',
    gi: 'GI-Reg 397 (Moradabad Metal Craft - Class 74)',
    season: 'Year-Round (Peak Manufacturing: Aug - Dec for Holiday Export)',
    icd: 'ICD Moradabad (CONCOR Rail Siding)',
    freight: '₹34,200 per TEU to Mundra / Nhava Sheva',
    lab: 'Metal Handicrafts Service Centre (MHSC) NABL Lab'
  },
  'Bhadohi': {
    name: 'Bhadohi, Uttar Pradesh',
    product: 'Handmade Woollen Knotted Carpets (HS 5701 10 10)',
    gi: 'GI-Reg 172 (Handmade Carpet of Bhadohi - Class 27)',
    season: 'All Season (Peak Weaving: Oct - Mar after monsoon)',
    icd: 'ICD Babatpur / ICD Chandauli (Varanasi)',
    freight: '₹36,800 per TEU to Kolkata / JNPT Port',
    lab: 'Indian Institute of Carpet Technology (IICT) Testing Lab'
  },
  'Nashik': {
    name: 'Nashik, Maharashtra',
    product: 'Fresh Table Grapes & Red Onions (HS 0806 10 00)',
    gi: 'GI-Reg 396 (Nashik Grapes - Class 31)',
    season: 'Peak: Jan - Apr (Grape Harvest) | Onion: Nov - Mar',
    icd: 'ICD Nashik (Janori / CONCOR)',
    freight: '₹16,800 per Reefer TEU to JNPT Port (FOB)',
    lab: 'National Referral Laboratory (NRC Grapes) ICAR Nashik'
  },
  'Surat': {
    name: 'Surat, Gujarat',
    product: 'Cut & Polished Diamonds & Synthetic Textiles (HS 7102)',
    gi: 'GI-Reg 512 (Surat Zari Craft - Class 52)',
    season: 'All Season Processing (Post-Diwali Export Surge)',
    icd: 'ICD Sachin / Surat (Western Railway Corridor)',
    freight: '₹14,200 per TEU to Nhava Sheva (JNPT)',
    lab: 'GJEPC Gem Testing Laboratory & SASMIRA Textile Lab'
  },
  'Darjeeling': {
    name: 'Darjeeling, West Bengal',
    product: 'Orthodox Premium Darjeeling Tea (HS 0902 40 10)',
    gi: 'GI-Reg 1 & 2 (India First GI - Darjeeling Tea Word & Logo)',
    season: 'First Flush: Mar-Apr | Second Flush: May-Jun | Autumnal: Oct-Nov',
    icd: 'ICD Siliguri / Kolkata Port Terminal',
    freight: '₹29,000 per TEU to Kolkata Port (Net FOB)',
    lab: 'Tea Board Quality Control Laboratory, Siliguri'
  },
  'Visakhapatnam': {
    name: 'Visakhapatnam, Andhra Pradesh',
    product: 'Frozen Marine Vannamei Shrimp (HS 0306 17 20)',
    gi: 'MPEDA Coastal Aquaculture Authority Registry',
    season: 'Summer Crop: Mar - Jun | Winter Crop: Sep - Dec',
    icd: 'Visakhapatnam Port Container Terminal (Direct Seaport)',
    freight: '₹8,500 per Reefer Container (Port Drayage)',
    lab: 'Export Inspection Agency (EIA) Lab & MPEDA QC Lab, Vizag'
  },
  'Karnal': {
    name: 'Karnal, Haryana',
    product: 'Aromatic Basmati Rice (Pusa 1121 - HS 1006 30 20)',
    gi: 'GI-Reg 145 (Basmati Rice - Indo-Gangetic Plains)',
    season: 'Basmati Paddy Harvest: Oct - Dec | Milling: Jan - Dec',
    icd: 'ICD Karnal / ICD Panipat (Foodgrain Siding)',
    freight: '₹28,000 per TEU to Kandla / Mundra Port',
    lab: 'Basmati Export Development Foundation (BEDF) Lab, Modipuram'
  },
  'Ludhiana': {
    name: 'Ludhiana, Punjab',
    product: 'Hosiery Knitwear & Industrial Fasteners (HS 6110 / 7318)',
    gi: 'Industrial Hosiery & Engineering Cluster Registry',
    season: 'Winter Wear: Apr - Sep | Shipping: Aug - Dec',
    icd: 'ICD Dhandari Kalan / Ludhiana (CONCOR DFC)',
    freight: '₹31,000 per TEU to Mundra Port via Western DFC',
    lab: 'Central Institute of Hand Tools (CIHT) & Wool Research Lab'
  },
  'Morbi': {
    name: 'Morbi, Gujarat',
    product: 'Ceramic Vitrified Tiles & Sanitaryware (HS 6907 21 00)',
    gi: 'Industrial Ceramic Cluster (CAPEXIL Registry)',
    season: 'Continuous Ceramic Production (24x7 Automated Kilns)',
    icd: 'ICD Morbi (Navlakhi Rail Link) / Pipavav DFC Corridor',
    freight: '₹11,500 per TEU to Kandla / Mundra Port',
    lab: 'Morbi Ceramic Association Testing Center & NABL Lab'
  }
};

function updateDistrictDeepDive(distName) {
  const d = ODOP_DEEP_DIVE_DATA[distName] || ODOP_DEEP_DIVE_DATA['Nizamabad'];
  const nameEl = document.getElementById('dd-district-name');
  const prodEl = document.getElementById('dd-product-name');
  const giEl = document.getElementById('dd-gi-tag');
  const seasonEl = document.getElementById('dd-season');
  const icdEl = document.getElementById('dd-icd');
  const freightEl = document.getElementById('dd-freight');
  const labEl = document.getElementById('dd-lab');

  if (nameEl) nameEl.textContent = d.name;
  if (prodEl) prodEl.textContent = d.product;
  if (giEl) giEl.textContent = d.gi;
  if (seasonEl) seasonEl.textContent = d.season;
  if (icdEl) icdEl.textContent = d.icd;
  if (freightEl) freightEl.textContent = d.freight;
  if (labEl) labEl.textContent = d.lab;
}

// ==================== PHASE 1: HIGH-TRUST TRADE ENTITIES DATASET ====================
const ENTITIES_DATA = [
  {
    id: "ENT-001",
    name: "Apex Maritime Logistics & CHA",
    category: "Customs Broker (CHA)",
    ports: ["JNPT / Nhava Sheva", "Mumbai Port (MBPT)"],
    city: "Navi Mumbai",
    state: "Maharashtra",
    contact_person: "Rajesh V. Mhatre (Director - Customs EDI)",
    phone: "+91 98201 44812",
    email: "operations@apexmaritime-cha.in",
    website: "https://apexmaritime-cha.in",
    license: "CHA/BOM/EDI/1408/2012",
    specialties: ["Engineering Goods (Ch 84, 85)", "Textiles & Garments (Ch 61, 62)", "Chemicals (Ch 29)"],
    volume: "18,500+ TEUs cleared annually",
    track_record: "99.4% first-time clearance; 0 unresolved show cause notices",
    complementary: ["Bonded Warehouse (35,000 sq ft Dronagiri)", "Fleet of 42 GPS container trailers", "Reefer plug points"],
    verified: true,
    dgft_status: "Clean / Active (No DEL listing)"
  },
  {
    id: "ENT-002",
    name: "Kutch Container Freight & Logistics",
    category: "Customs Broker (CHA)",
    ports: ["Mundra Port", "Kandla / Deendayal Port"],
    city: "Gandhidham",
    state: "Gujarat",
    contact_person: "Bhavin K. Patel (Head of Port Operations)",
    phone: "+91 98795 22104",
    email: "bhavin.patel@kutchfreight.co.in",
    website: "https://kutchfreight.co.in",
    license: "CHA/MUN/EDI/0892/2016",
    specialties: ["Agri Commodities (Ch 08, 09, 10)", "Ceramics & Tiles (Ch 69)", "Minerals & Ores (Ch 25)"],
    volume: "24,000+ TEUs / bulk handled annually",
    track_record: "Average Mundra dwell clearance: 14 hours; APEDA phytosanitary desk on-site",
    complementary: ["Grain fumigation chamber", "Weighbridge & 15,000 MT warehouse", "Rail siding to ICD Morbi"],
    verified: true,
    dgft_status: "Clean / Active"
  },
  {
    id: "ENT-003",
    name: "Coromandel Coastal Clearances & CFS",
    category: "Customs Broker (CHA)",
    ports: ["Chennai Port", "Kattupalli Port", "Ennore Port"],
    city: "Chennai",
    state: "Tamil Nadu",
    contact_person: "S. Ramanathan (Chief Customs Executive)",
    phone: "+91 94440 81290",
    email: "ramanathan@coromandelcfs.com",
    website: "https://coromandelcfs.com",
    license: "CHA/MAA/EDI/2103/2008",
    specialties: ["Auto Components (Ch 87)", "Leather & Footwear (Ch 42, 64)", "Electronic Hardware (Ch 85)"],
    volume: "15,200+ TEUs annually",
    track_record: "AEO-T2 certified broker; green-channel automated assessment expert",
    complementary: ["Customs Bonded CFS (Ennore Expressway)", "Dangerous Goods (IMDG) handling", "Daily shuttle to ICD Whitefield"],
    verified: true,
    dgft_status: "Clean / Active"
  },
  {
    id: "ENT-004",
    name: "Snowman Agro Cold Chain & Packhouse",
    category: "Cold Chain / CFS Operator",
    ports: ["JNPT / Nhava Sheva", "Cochin Port"],
    city: "Panvel / Navi Mumbai",
    state: "Maharashtra",
    contact_person: "Vikramaditya Sengupta (Head - Cold Chain Exim)",
    phone: "+91 98112 77093",
    email: "agro.exports@snowmancold.in",
    website: "https://snowmancold.in",
    license: "Cold Chain Operator & Packhouse",
    specialties: ["Fresh Mangoes & Grapes (Ch 08)", "Seafood & Shrimps (Ch 03)", "Pharma Active Ingredients (Ch 30)"],
    volume: "4,200 Reefer containers handled annually",
    track_record: "APEDA & EIC recognized export packhouse; hot water immersion facility",
    complementary: ["Reefer fleet (-25°C to +15°C)", "Pre-cooling chambers (100 MT/day)", "Direct rail reefer to JNPT terminal"],
    verified: true,
    dgft_status: "Clean / Active"
  },
  {
    id: "ENT-005",
    name: "SGS India Testing & Inspection Laboratories",
    category: "Accredited Inspection & Testing Agency",
    ports: ["JNPT", "Mundra", "Chennai", "Kolkata", "Tirupur", "Guntur"],
    city: "Pan-India",
    state: "National Network",
    contact_person: "Dr. Arindam Mukherjee (Director - Agri & Food Testing)",
    phone: "+91 22 6640 8888",
    email: "in.trade.inspection@sgs.com",
    website: "https://www.sgs.com/en-in",
    license: "NABL TC-5421 / EIC Approved",
    specialties: ["Food & Agricultural Products", "Textile Chemical Testing (REACH / Oeko-Tex)", "Metal & Mineral Assaying"],
    volume: "65,000+ Certificates of Analysis (CoA) issued annually",
    track_record: "Direct API upload of test certificates to FSSAI & ICEGATE e-SANCHIT",
    complementary: ["Pre-shipment Container Inspection", "Loading Supervision & Weight Certification", "Factory Compliance Auditing"],
    verified: true,
    dgft_status: "Accredited Testing & Inspection Agency"
  },
  {
    id: "ENT-006",
    name: "Vimta Labs Ltd (Food, Agri & Pharma Analytical)",
    category: "Accredited Inspection & Testing Agency",
    ports: ["Hyderabad ICD", "Chennai Port", "Vizag Port"],
    city: "Hyderabad",
    state: "Telangana",
    contact_person: "K. V. Subba Rao (VP - Quality & Regulatory)",
    phone: "+91 40 6740 4040",
    email: "exports.testing@vimta.com",
    website: "https://www.vimta.com",
    license: "NABL TC-5012 / US FDA Inspected",
    specialties: ["Pesticide Residue Analysis (GC-MS/MS)", "Aflatoxin Testing (Spices/Grains)", "Heavy Metal Profiling (ICP-MS)"],
    volume: "45,000+ Samples tested annually for EU, US & Japan compliance",
    track_record: "APEDA certified sampling network across Guntur, Chittoor & Ratnagiri",
    complementary: ["Shelf-life stability studies", "US FDA / EU Nutrition Labeling", "Organic certification validation"],
    verified: true,
    dgft_status: "NABL & APEDA Accredited"
  },
  {
    id: "ENT-007",
    name: "APEDA (Agri & Processed Food Export Dev Authority)",
    category: "Export Promotion Council (EPC)",
    ports: ["All Indian Ports & Air Cargo Complexes"],
    city: "New Delhi (HQ) + Regional Offices",
    state: "Govt. of India",
    contact_person: "Nodal Officer - Trade Facilitation Desk",
    phone: "+91 11 4148 6013",
    email: "headq@apeda.gov.in",
    website: "https://apeda.gov.in",
    license: "Statutory Export Body under APEDA Act 1985",
    specialties: ["Fresh Fruits & Vegetables", "Basmati & Non-Basmati Rice", "Processed Foods & Dairy", "Organic Produce"],
    volume: "US$ 25+ Billion agricultural exports facilitated annually",
    track_record: "Online RCMC issuance within 48h; Phytosanitary certificate integration with Plant Quarantine",
    complementary: ["Financial Assistance Schemes (40% Packhouse subsidies)", "Buyer-Seller Meets (BSMs) in Gulf & EU", "HortiNet traceability"],
    verified: true,
    dgft_status: "Government Statutory Authority"
  },
  {
    id: "ENT-008",
    name: "FIEO (Federation of Indian Export Organisations)",
    category: "Export Promotion Council (EPC)",
    ports: ["Apex Body for All Indian Exporters"],
    city: "New Delhi (HQ) + 12 Chapter Offices",
    state: "Ministry of Commerce & Industry",
    contact_person: "Deputy Director General - Dispute Resolution",
    phone: "+91 11 4604 2222",
    email: "fieo@fieo.org",
    website: "https://www.fieo.org",
    license: "Apex Body set up by Ministry of Commerce",
    specialties: ["Multi-Sector RCMC (Merchandise & Services)", "Certificate of Origin (Preferential / Non-Preferential)", "Trade Disputes"],
    volume: "Over 35,000 active member exporters across India",
    track_record: "Official facilitator for DGFT RoDTEP review and RoSCTL representations",
    complementary: ["Global Trade Helpdesk", "Free Trade Agreement (FTA) utilization cell", "International trade delegations"],
    verified: true,
    dgft_status: "Government Recognized Apex Trade Body"
  }
];

function renderEntityDirectory(list) {
  const container = document.getElementById('entities-cards-container');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="p-4 rounded-2xl border text-center text-xs" style="background: var(--card-inner-bg); border-color: var(--card-inner-border); color: var(--text-muted);">
        No trade entities found matching your search.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(e => `
    <div class="p-3.5 rounded-2xl border space-y-2 text-xs transition-all hover:border-[var(--accent)]" style="background: var(--card-inner-bg); border-color: var(--card-inner-border);">
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded border" style="background: var(--accent-light); border-color: var(--accent-border); color: var(--accent);">${e.category}</span>
          <h4 class="font-extrabold text-xs pt-1" style="color: var(--text-main);">${e.name}</h4>
          <span class="text-[10px] block" style="color: var(--text-muted);">${e.city}, ${e.state} &bull; Ports: ${e.ports.join(', ')}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono flex-shrink-0" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">✓ Verified</span>
      </div>

      <div class="flex items-center justify-between pt-1 border-t text-[11px]" style="border-color: var(--card-border);">
        <div class="flex items-center gap-3">
          <a href="tel:${e.phone.replace(/\\s+/g, '')}" class="font-bold flex items-center gap-1 active:scale-95" style="color: var(--accent);">
            <span>📞 Call</span>
          </a>
          <a href="mailto:${e.email}" class="font-bold flex items-center gap-1 active:scale-95" style="color: var(--text-dim);">
            <span>✉️ Email</span>
          </a>
        </div>
        <button onclick="viewEntityDossier('${e.id}')" class="px-2.5 py-1 rounded-xl border text-[10px] font-bold active:scale-95 transition-transform" style="background: var(--card-inner-bg); border-color: var(--card-inner-border); color: var(--accent);">
          360° Dossier &rarr;
        </button>
      </div>
    </div>
  `).join('');
}

function filterEntityCategory(category) {
  activeEntityCategory = category;
  document.querySelectorAll('.ent-pill-btn').forEach(btn => {
    btn.style.background = 'var(--card-inner-bg)';
    btn.style.borderColor = 'var(--card-inner-border)';
    btn.style.color = 'var(--text-main)';
  });

  const catMap = {
    'all': 'ent-filter-all',
    'Customs Broker (CHA)': 'ent-filter-cha',
    'Cold Chain / CFS Operator': 'ent-filter-cfs',
    'Accredited Inspection & Testing Agency': 'ent-filter-lab',
    'Export Promotion Council (EPC)': 'ent-filter-epc'
  };

  const activeBtn = document.getElementById(catMap[category] || 'ent-filter-all');
  if (activeBtn) {
    activeBtn.style.background = 'var(--accent)';
    activeBtn.style.color = '#ffffff';
  }

  const query = (document.getElementById('entity-search-input')?.value || '').toLowerCase();
  let filtered = category === 'all' ? ENTITIES_DATA : ENTITIES_DATA.filter(e => e.category === category);
  if (query) {
    filtered = filtered.filter(e => 
      e.name.toLowerCase().includes(query) ||
      e.city.toLowerCase().includes(query) ||
      e.ports.some(p => p.toLowerCase().includes(query)) ||
      e.specialties.some(s => s.toLowerCase().includes(query))
    );
  }
  renderEntityDirectory(filtered);
}

function searchEntities(query) {
  const q = query.toLowerCase().trim();
  let filtered = activeEntityCategory === 'all' ? ENTITIES_DATA : ENTITIES_DATA.filter(e => e.category === activeEntityCategory);
  if (q) {
    filtered = filtered.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.ports.some(p => p.toLowerCase().includes(q)) ||
      e.specialties.some(s => s.toLowerCase().includes(q))
    );
  }
  renderEntityDirectory(filtered);
}

function viewEntityDossier(id) {
  const e = ENTITIES_DATA.find(x => x.id === id);
  if (!e) return;

  document.getElementById('ed-category').textContent = e.category;
  document.getElementById('ed-name').textContent = e.name;
  document.getElementById('ed-contact-person').textContent = e.contact_person;
  
  const phoneEl = document.getElementById('ed-phone-link');
  if (phoneEl) {
    phoneEl.textContent = e.phone;
    phoneEl.href = `tel:${e.phone.replace(/\\s+/g, '')}`;
  }

  const emailEl = document.getElementById('ed-email-link');
  if (emailEl) {
    emailEl.textContent = e.email;
    emailEl.href = `mailto:${e.email}`;
  }

  const webEl = document.getElementById('ed-website-link');
  if (webEl) webEl.href = e.website;

  document.getElementById('ed-ports').textContent = `${e.ports.join(', ')} • ${e.city}, ${e.state}`;
  document.getElementById('ed-license').textContent = e.license;
  document.getElementById('ed-volume').textContent = e.volume;
  document.getElementById('ed-track-record').textContent = e.track_record;
  document.getElementById('ed-dgft').textContent = e.dgft_status;

  const tagsContainer = document.getElementById('ed-complementary-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = e.complementary.map(c => `
      <span class="px-2 py-1 rounded-lg border text-[10px] font-medium" style="background: var(--dropdown-bg); border-color: var(--card-border); color: var(--text-main);">${c}</span>
    `).join('');
  }

  document.getElementById('entity-dossier-modal').classList.remove('hidden');
}

function closeEntityDossierModal() {
  document.getElementById('entity-dossier-modal').classList.add('hidden');
}

// ==================== PHASE 2: INCOTERMS 2020 & ECGC RISK ====================
const INCOTERMS_DATA = {
  'EXW': {
    title: 'EXW (Ex Works - Named Place)',
    suitability: 'Zero Logistics Risk (Domestic Selling)',
    seller: 'Export Packaging only. Goods made available at factory gate.',
    buyer: 'All freight, origin THC, export customs clearance, ocean shipping, import duties and delivery.',
    risk: 'Transfers at seller factory door as soon as cargo is placed at buyer disposal.'
  },
  'FOB': {
    title: 'FOB (Free On Board - Named Port)',
    suitability: 'Standard Exim (Optimal Balance)',
    seller: 'Export Packaging, Factory Loading, Inland Port Freight, Export Clearance & Origin THC.',
    buyer: 'International Ocean / Air Freight, Marine Insurance, Destination Port Clearance & Tariffs.',
    risk: 'Transfers when goods are securely loaded on board the vessel at departure port.'
  },
  'CIF': {
    title: 'CIF (Cost, Insurance & Freight - Destination Port)',
    suitability: 'High Margin (Seller Arranges Freight)',
    seller: 'Export Packaging, Inland Freight, Export Clearance, Origin THC, Ocean Freight & Marine Insurance.',
    buyer: 'Destination Port Handling, Import Customs Clearance, Local Tariffs, and inland delivery.',
    risk: 'Risk transfers on board vessel at origin port; seller pays freight & insurance to destination port.'
  },
  'DDP': {
    title: 'DDP (Delivered Duty Paid - Buyer Door)',
    suitability: 'Maximum Premium (Full Turnkey Delivery)',
    seller: 'All costs end-to-end: Packaging, Inland Freight, Export Clearance, Ocean Freight, Marine Insurance, Import Customs Duties & Destination Delivery.',
    buyer: 'Unloading cargo at final facility.',
    risk: 'Transfers only when goods arrive cleared for import at buyer designated warehouse.'
  }
};

function selectIncoterm(term) {
  document.querySelectorAll('.inco-tab-btn').forEach(btn => {
    btn.style.background = 'var(--card-inner-bg)';
    btn.style.color = 'var(--text-main)';
  });
  const activeBtn = document.getElementById(`inco-btn-${term}`);
  if (activeBtn) {
    activeBtn.style.background = 'var(--accent-light)';
    activeBtn.style.color = 'var(--accent)';
  }

  const d = INCOTERMS_DATA[term] || INCOTERMS_DATA['FOB'];
  document.getElementById('inco-title').textContent = d.title;
  document.getElementById('inco-suitability').textContent = d.suitability;
  document.getElementById('inco-seller').textContent = d.seller;
  document.getElementById('inco-buyer').textContent = d.buyer;
  document.getElementById('inco-risk').textContent = d.risk;
}

const ECGC_COUNTRY_DATA = {
  'AE': {
    name: 'United Arab Emirates (UAE)',
    badge: 'Tier A2 • 0.35% Premium',
    badgeColor: '#10B981',
    terms: 'Letter of Credit (LC) at Sight, or Documents Against Acceptance (DA 30-60 Days) with ECGC Buyer Cover',
    caution: 'Ensure buyer trade license in DED or Free Zone is active. Verify VAT TRN prior to consignment release.'
  },
  'US': {
    name: 'United States (USA)',
    badge: 'Tier A1 • 0.25% Premium',
    badgeColor: '#10B981',
    terms: 'Open Account (30-60 Days) or CAD (Cash Against Documents)',
    caution: 'Verify US FDA Prior Notice and Lacey Act / CPSC compliance to avoid CBP border hold.'
  },
  'GB': {
    name: 'United Kingdom (UK)',
    badge: 'Tier A1 • 0.28% Premium',
    badgeColor: '#10B981',
    terms: 'CAD or 30-Day Irrevocable LC',
    caution: 'UK REACH and BTOM (Border Target Operating Model) sanitary requirements on agri/food items.'
  },
  'SA': {
    name: 'Saudi Arabia',
    badge: 'Tier A2 • 0.38% Premium',
    badgeColor: '#10B981',
    terms: 'Irrevocable LC at Sight or 30% Advance + 70% against B/L copy',
    caution: 'SABER / SASO certificate of conformity mandatory before shipment departure.'
  },
  'VN': {
    name: 'Vietnam',
    badge: 'Tier A2 • 0.42% Premium',
    badgeColor: '#10B981',
    terms: '30% Advance + 70% CAD / LC at Sight',
    caution: 'High demand for Guntur dry chillies and seafood. Phytosanitary certificate must state absence of prohibited weed seeds.'
  },
  'BD': {
    name: 'Bangladesh',
    badge: 'Tier B2 • 1.15% Premium (Forex Alert)',
    badgeColor: '#F59E0B',
    terms: '100% Confirmed Irrevocable LC from Tier-1 Bank (e.g. Standard Chartered / HSBC Dhaka) or 100% Advance',
    caution: 'Forex scarcity; local bank LCs frequently face deferred settlement delays. Insist on international confirmation.'
  },
  'NG': {
    name: 'Nigeria',
    badge: 'Tier C1 • 2.40% Premium (High Risk)',
    badgeColor: '#EF4444',
    terms: '100% Advance Wire Transfer (T/T in USD/EUR) or Confirmed LC with Prime European/US Bank Confirmation',
    caution: 'Form M requirement; severe CBN forex rationing; strict SONCAP product inspection mandatory.'
  }
};

function updateEcgcCountry(code) {
  const d = ECGC_COUNTRY_DATA[code] || ECGC_COUNTRY_DATA['AE'];
  document.getElementById('ecgc-country-name').textContent = d.name;
  
  const badgeEl = document.getElementById('ecgc-risk-badge');
  if (badgeEl) {
    badgeEl.textContent = d.badge;
    badgeEl.style.color = d.badgeColor;
  }
  document.getElementById('ecgc-payment-terms').textContent = d.terms;
  document.getElementById('ecgc-caution-points').textContent = d.caution;
}

function copyNcndaAgreement() {
  const name = document.getElementById('legal-intermediary-name')?.value || 'Trade Link International';
  const comm = document.getElementById('legal-commission-pct')?.value || '2.5';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const text = `NON-CIRCUMVENTION, NON-DISCLOSURE & WORKING AGREEMENT (NCNDA)
Incorporating International Chamber of Commerce (ICC 500/600) Standards

WHEREAS, the undersigned Intermediary / Trade Consultant (${name}) possesses proprietary source contacts, verified supplier networks, and trade relationship intelligence;

AND WHEREAS, the Client / Buyer desires to procure merchandise originating from India;

NOW THEREFORE, IT IS MUTUALLY AGREED:
1. NON-CIRCUMVENTION: The Parties agree not to circumvent, avoid, bypass, or obviate each other directly or indirectly, nor avoid payments of fees or commissions in any transaction involving contacts, suppliers, buyers, or sources revealed by the Intermediary.
2. CONFIDENTIALITY: All trade details, pricing structures, supplier identities, and logistical contacts disclosed shall remain confidential for a period of five (5) years.
3. COMMISSIONS: In consideration of the business transacted, the Intermediary shall be protected and paid a verified commission fee of ${comm}% on the total FOB value of all shipments arising directly or indirectly from introductions made herein.
4. JURISDICTION: This Agreement shall be governed by the laws of India and subject to the exclusive jurisdiction of the Courts of Mumbai / New Delhi.

IN WITNESS WHEREOF, the Parties execute this NCNDA on ${today}.
Intermediary: ${name}
Signature / Stamp: ______________________`;

  navigator.clipboard.writeText(text).then(() => {
    const status = document.getElementById('legal-copy-status');
    if (status) {
      status.textContent = '✓ Statutory ICC NCNDA copied to clipboard!';
      setTimeout(() => { status.textContent = ''; }, 3500);
    }
  });
}

function copyImfpaAgreement() {
  const name = document.getElementById('legal-intermediary-name')?.value || 'Trade Link International';
  const comm = document.getElementById('legal-commission-pct')?.value || '2.5';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const text = `IRREVOCABLE MASTER FEE PROTECTION AGREEMENT (IMFPA)
Bank-Enforceable Commission Mandate

TO: The Paying Bank / Paymaster
TRANSACTION REF: WOT-EXPORT-${Date.now().toString().slice(-6)}

We, the undersigned Buyer/Seller, hereby irrevocably and unconditionally guarantee to pay the designated Intermediary / Mandate (${name}) a non-negotiable fee of ${comm}% on the gross FOB value of every consignment, tranche, or partial delivery shipped under this Contract.

PAYMENT INSTRUCTION:
1. The commission fee shall be paid simultaneously upon negotiation and liquidation of the export Letter of Credit or wire transfer receipt.
2. This Fee Protection Agreement is irrevocable, non-transferable, and assignable to the Intermediary's designated bank account without any right of set-off or counter-claim.

EXECUTED BY AUTHORIZED SIGNATORY ON ${today}.
Intermediary: ${name}
Designated Bank: State Bank of India / HDFC Bank
Signature / Stamp: ______________________`;

  navigator.clipboard.writeText(text).then(() => {
    const status = document.getElementById('legal-copy-status');
    if (status) {
      status.textContent = '✓ Bank-Enforceable IMFPA copied to clipboard!';
      setTimeout(() => { status.textContent = ''; }, 3500);
    }
  });
}

// ==================== PHASE 3: CAREER PERSONA TRACKS ====================
const CAREER_PERSONAS_DATA = {
  'broker': {
    title: 'Commission Sourcing Agent / Trade Broker',
    capital: 'Capital Required: ₹0 (Zero Capital)',
    income: '1.5% - 3.0% Comm.',
    model: 'Connect verified ODOP district manufacturers with overseas buyers or domestic export houses without holding inventory or taking title.',
    shield: 'Execute 1-tap NCNDA + Bank IMFPA before disclosing factory identities or pricing. Commission wired on LC liquidation.',
    legal: 'Proprietorship / LLP + GSTIN (for commission invoicing) + Current Bank Account. (No IEC required for domestic brokerage).',
    milestone: 'Pick 1 ODOP cluster (e.g. Guntur chillies), visit 3 packhouses, obtain verified FOB quotes, and pitch to UAE/Vietnam importers on LinkedIn & Trade Leads.'
  },
  'exporter': {
    title: 'Merchant Exporter (Physical Cargo Trading)',
    capital: 'Capital Required: ₹2L - ₹10L (or Back-to-Back LC)',
    income: '15% - 28% Net Margin',
    model: 'Procure merchandise from Indian factories at domestic prices, handle export customs, and export under your own brand/invoice.',
    shield: '100% Irrevocable Confirmed LC at Sight + ECGC Small Exporter Policy + Marine All-Risk insurance.',
    legal: 'Import Export Code (IEC) from DGFT + GSTIN + RCMC (APEDA/FIEO) + Authorized Dealer (AD) Code registration at port of export.',
    milestone: 'Execute first 1-container trial order (e.g. 20ft container of textiles or spices) utilizing 60% bank packing credit.'
  },
  'consultant': {
    title: 'Trade & Customs Compliance Consultant',
    capital: 'Capital Required: ₹0 (Knowledge-as-a-Service)',
    income: '₹25,000 - ₹1,50,000 / month retainer',
    model: 'Provide compliance advisory to SMEs: ICEGATE error resolution (SB001-SB006), RoDTEP scrip liquidation, and duty drawback recovery.',
    shield: 'Consulting Retainer Agreement + Success-fee share (10%-20% of stuck drawback recovered).',
    legal: 'Proprietorship + Professional GST registration + LinkedIn thought leadership presence.',
    milestone: 'Resolve 1 stuck duty drawback or PFMS mismatch for a local exporter using the World of Trade ICEGATE Error Decoder.'
  },
  'aggregator': {
    title: 'ODOP Cluster Aggregator & Consortium Lead',
    capital: 'Capital Required: ₹5L - ₹15L (Working Capital)',
    income: '18% - 32% Consolidated Spread',
    model: 'Consolidate small artisan or farmer batches in ODOP clusters into Full Container Loads (FCL), unlocking volume freight discounts.',
    shield: 'Farmer Producer Company (FPC) tie-up + APEDA packhouse subsidy (40%) + Inland Container Depot (ICD) railhead pooling.',
    legal: 'Private Limited / FPO registration + APEDA / Spices Board RCMC + Quality testing tie-up with accredited NABL lab.',
    milestone: 'Pool 5 small weaver/farmer batches in Varanasi or Nizamabad into a single 20ft container for Middle East export.'
  },
  'coach': {
    title: 'Practical Ground-Trade Coach & Trainer',
    capital: 'Capital Required: ₹0 (EdTech / Coaching)',
    income: '₹15,000 - ₹50,000 per student batch',
    model: 'Teach non-academic, ground-level trade mechanics to aspiring entrepreneurs: duty trees, shipping bills, demurrage prevention, and buyer verification.',
    shield: 'Live interactive case studies powered by World of Trade terminal and simulated ICEGATE scenarios.',
    legal: 'Sole Proprietorship + Digital training portal / Community platform (WhatsApp/Telegram masterminds).',
    milestone: 'Host a weekend masterclass on "How to Clear Customs & Claim RoDTEP Cash Without Middlemen".'
  },
  'institutional': {
    title: 'Institutional Trade Lead & Council Executive',
    capital: 'Capital Required: ₹0 (High-Impact Career Track)',
    income: '₹18L - ₹45L Annual CTC / Corporate Roles',
    model: 'Lead international trade desks, supply chain procurement, or trade policy advocacy at EPCs (FIEO, APEDA, EEPC) or multinational trading houses.',
    shield: 'Deep mastery of bilateral FTAs, non-tariff TBT/SPS regulations, and multilateral trade flows.',
    legal: 'Professional credentials + demonstrable mastery of DGCI&S, Comtrade, and RBI balance of payments data.',
    milestone: 'Prepare a strategic policy brief on India-UAE CEPA utilization for an export promotion body using World of Trade data.'
  }
};

function selectCareerPersona(key) {
  document.querySelectorAll('.persona-tab-btn').forEach(btn => {
    btn.style.background = 'var(--card-inner-bg)';
    btn.style.borderColor = 'var(--card-inner-border)';
    btn.style.color = 'var(--text-main)';
  });

  const activeBtn = document.getElementById(`persona-btn-${key}`);
  if (activeBtn) {
    activeBtn.style.background = 'var(--accent)';
    activeBtn.style.color = '#ffffff';
  }

  const d = CAREER_PERSONAS_DATA[key] || CAREER_PERSONAS_DATA['broker'];
  document.getElementById('cp-title').textContent = d.title;
  document.getElementById('cp-capital').textContent = d.capital;
  document.getElementById('cp-target-income').textContent = d.income;
  document.getElementById('cp-model').textContent = d.model;
  document.getElementById('cp-shield').textContent = d.shield;
  document.getElementById('cp-legal').textContent = d.legal;
  document.getElementById('cp-milestone').textContent = d.milestone;
}

// ==================== PHASE 3: 1-PAGE COMMERCIAL DEAL MEMO ====================
function openDealMemoModal() {
  const modal = document.getElementById('deal-memo-modal');
  if (!modal) return;

  const m = currentDealMemo || {
    deal_id: "WOT-DM-05000",
    commodity: "Cotton T-shirts & Readymade Knitted Garments",
    hs_code: "6109.10.00",
    fob_value_inr: 5000000,
    procurement_cost_inr: 3600000,
    inland_and_cha_cost_inr: 225000,
    gross_trade_margin_inr: 1175000,
    statutory_government_rebate_inr: 272500,
    net_commercial_profit_inr: 1447500,
    net_margin_pct: 28.95,
    capital_required_inr: 1440000,
    bank_packing_credit_inr: 2160000,
    milestone_schedule: [
      { day: "Day 1-3", action: "Contract & 1-tap NCNDA execution; Proforma Invoice with confirmed LC issuance" },
      { day: "Day 4-12", action: "Batch procurement from verified ODOP cluster supplier base" },
      { day: "Day 13-16", action: "NABL lab sampling & Certificate of Analysis (CoA) generation" },
      { day: "Day 17-21", action: "Container stuffing, certified weighbridge VGM slip & Rule 138 e-Way Bill" },
      { day: "Day 22-25", action: "Port gate in at Gateway Port; LEO customs clearance" },
      { day: "Day 26-28", action: "Vessel sails; negotiable On-Board Bill of Lading (B/L) issued" },
      { day: "Day 29-33", action: "ICEGATE EDI automatically dispatches Duty Drawback direct to bank" },
      { day: "Day 34-45", action: "RoDTEP/RoSCTL electronic scrip generated on customs ledger" },
      { day: "Day 60-75", action: "Authorized Dealer bank realizes export remittance and logs e-BRC / EDPMS" }
    ]
  };

  document.getElementById('dm-deal-id').textContent = m.deal_id;
  document.getElementById('dm-commodity').textContent = m.commodity;
  document.getElementById('dm-hs').textContent = `ITC-HS: ${m.hs_code} • FOB Export Consignment`;
  document.getElementById('dm-fob').textContent = `₹${Math.round(m.fob_value_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-prod').textContent = `₹${Math.round(m.procurement_cost_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-inland').textContent = `₹${Math.round(m.inland_and_cha_cost_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-rebate').textContent = `+₹${Math.round(m.statutory_government_rebate_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-margin-pct').textContent = `${m.net_margin_pct}% Net`;
  document.getElementById('dm-profit').textContent = `₹${Math.round(m.net_commercial_profit_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-margin-money').textContent = `₹${Math.round(m.capital_required_inr).toLocaleString('en-IN')}`;
  document.getElementById('dm-packing-credit').textContent = `₹${Math.round(m.bank_packing_credit_inr).toLocaleString('en-IN')}`;

  const msContainer = document.getElementById('dm-milestones-container');
  if (msContainer && m.milestone_schedule) {
    msContainer.innerHTML = m.milestone_schedule.map(s => `
      <div class="flex items-start gap-2">
        <span class="font-mono font-bold flex-shrink-0" style="color: var(--accent);">${s.day}:</span>
        <span style="color: var(--text-main);">${s.action}</span>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
}

function closeDealMemoModal() {
  document.getElementById('deal-memo-modal')?.classList.add('hidden');
}

function copyDealMemoText() {
  const m = currentDealMemo;
  if (!m) return;
  const text = `EXECUTIVE COMMERCIAL DEAL MEMO
Deal Reference: ${m.deal_id}
Commodity: ${m.commodity} (ITC-HS: ${m.hs_code})
Consignment FOB Value: ₹${Math.round(m.fob_value_inr).toLocaleString('en-IN')}

FINANCIAL FEASIBILITY:
- Procurement & Sourcing (72%): ₹${Math.round(m.procurement_cost_inr).toLocaleString('en-IN')}
- Inland Freight & CHA Port Clearances: ₹${Math.round(m.inland_and_cha_cost_inr).toLocaleString('en-IN')}
- Statutory Government Cash Rebates: +₹${Math.round(m.statutory_government_rebate_inr).toLocaleString('en-IN')}
- Net Commercial Profit: ₹${Math.round(m.net_commercial_profit_inr).toLocaleString('en-IN')}
- Net Margin: ${m.net_margin_pct}% Net

BANK PACKING CREDIT ALLOCATION:
- Promoter Margin Money (40%): ₹${Math.round(m.capital_required_inr).toLocaleString('en-IN')}
- Bank Packing Credit Eligible (60%): ₹${Math.round(m.bank_packing_credit_inr).toLocaleString('en-IN')}
- Cash Cycle: 75 Days (Procurement to Inward Bank Remittance)

RISK MITIGATION:
- ECGC Comprehensive Small Exporter Policy (90% commercial default cover)
- Irrevocable Confirmed Letter of Credit at Sight (UCP 600 rules)
- Institute Cargo Clauses (A) Marine All-Risk Policy

Generated via World of Trade Intelligence Terminal`;

  navigator.clipboard.writeText(text).then(() => {
    alert("Deal Memo copied to clipboard!");
  });
}

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
window.setHsTariff = setHsTariff;
window.decodeIcegateError = decodeIcegateError;
window.calculateFtaValueAddition = calculateFtaValueAddition;
window.copyBreakdownNotice = copyBreakdownNotice;
window.updateDistrictDeepDive = updateDistrictDeepDive;
// New Phase 1, 2, 3 bindings
window.filterEntityCategory = filterEntityCategory;
window.searchEntities = searchEntities;
window.viewEntityDossier = viewEntityDossier;
window.closeEntityDossierModal = closeEntityDossierModal;
window.selectIncoterm = selectIncoterm;
window.updateEcgcCountry = updateEcgcCountry;
window.copyNcndaAgreement = copyNcndaAgreement;
window.copyImfpaAgreement = copyImfpaAgreement;
window.selectCareerPersona = selectCareerPersona;
window.openDealMemoModal = openDealMemoModal;
window.closeDealMemoModal = closeDealMemoModal;
window.copyDealMemoText = copyDealMemoText;

// DOM Initialization
window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Active Editorial Theme from localStorage
  const savedTheme = localStorage.getItem('wot_editorial_theme') || 'kyoto-tea';
  applyTheme(savedTheme);

  // 2. Render initial Entity Directory
  renderEntityDirectory(ENTITIES_DATA);

  // 3. Search input listener for clear button
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

  // 4. Initial Load: Default trade pulse query
  setQuery("What are India's overall trade totals and deficit?");
});
