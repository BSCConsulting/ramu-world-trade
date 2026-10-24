// World of Trade — iOS Native-Feel PWA Engine (iPhone 15 Optimized)

let currentChart = null;
let currentTab = 'apps';
let mandiSecondsLeft = 2 * 3600 + 44 * 60 + 18;
let ewaySecondsLeft = 18 * 3600 + 32 * 60 + 5;

// 1. PRIMARY NATIVE 5-TAB CONTROLLER (Apps, Agenda, Scratchpad, Timer, Profile)
function switchNativeTab(tabName) {
  currentTab = tabName;
  const tabs = ['apps', 'agenda', 'scratchpad', 'timer', 'profile'];

  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-btn-${t}`);
    if (section && navBtn) {
      if (t === tabName) {
        section.classList.remove('hidden');
        navBtn.classList.remove('text-neutral-500');
        navBtn.classList.add('text-amber-400');
      } else {
        section.classList.add('hidden');
        navBtn.classList.remove('text-amber-400');
        navBtn.classList.add('text-neutral-500');
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
  if (input) {
    input.value = text;
    handleSearch();
  }
}

// 3. MAIN CONVERSATIONAL SEARCH & TRIANGULATION
async function handleSearch(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('query-input');
  const query = input.value.trim();
  if (!query) return;

  const submitBtn = document.getElementById('submit-btn');
  const outputEl = document.getElementById('markdown-output');
  const classCard = document.getElementById('classification-card');

  // Loading state with native feel
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="animate-pulse text-[10px]">...</span>`;
  outputEl.innerHTML = `<div class="py-6 text-center text-neutral-400 animate-pulse text-xs">Triangulating official records across DGCI&S, RBI & UN Comtrade...</div>`;

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
      document.getElementById('class-domain').textContent = data.classification.domain || 'Merchandise';
    }

    // Render Clean High-Contrast Markdown
    if (data.formatted_markdown) {
      outputEl.innerHTML = marked.parse(data.formatted_markdown);
    }

    // Render OLED Optimized Chart
    if (data.chart_data) {
      renderChart(data.chart_data);
    }

  } catch (err) {
    outputEl.innerHTML = `<div class="p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-xl text-xs">Error: ${err.message}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Ask</span>`;
  }
}

// 4. OLED HIGH-CONTRAST CHART ENGINE (Chart.js for Super Retina XDR)
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

  // Pure OLED High Contrast Palette
  const oledColors = ['#ff9f0a', '#30d158', '#0a84ff', '#bf5af2', '#ff453a'];

  currentChart = new Chart(ctx, {
    type: chartData.type || 'bar',
    data: {
      labels: chartData.labels || [],
      datasets: (chartData.datasets || []).map(ds => ({
        ...ds,
        backgroundColor: ds.backgroundColor || oledColors,
        borderRadius: 8,
        borderWidth: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#a1a1aa', font: { size: 10, weight: 'bold' }, boxWidth: 10 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#a1a1aa', font: { size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#a1a1aa', font: { size: 9 } },
          grid: { color: 'rgba(255, 255, 255, 0.06)' }
        }
      }
    }
  });
}

// 5. EXPORT CASH & RoDTEP CALCULATOR (Scratchpad Tab)
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

    // Populate Real-Time Cards
    document.getElementById('card-rodtep').textContent = `₹${c.rodtep_inr.toLocaleString('en-IN')}`;
    document.getElementById('card-rodtep-pct').textContent = `${c.rodtep_pct}% statutory scrip`;
    document.getElementById('card-drawback').textContent = `₹${c.drawback_inr.toLocaleString('en-IN')}`;
    document.getElementById('card-drawback-pct').textContent = `${c.drawback_pct}% customs scroll`;
    document.getElementById('card-total-cash').textContent = `₹${c.total_direct_cash_inr.toLocaleString('en-IN')}`;
    document.getElementById('card-margin-boost').textContent = `+${c.combined_rebate_pct}% Direct Margin Boost`;

  } catch (err) {
    console.error("Calculation error:", err);
  }
}

// 6. NATIVE iOS BOTTOM SHEET CONTROLLER (<768px swipeable sheet)
function openBottomSheet(type) {
  const sheet = document.getElementById('bottom-sheet');
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  const title = document.getElementById('bottom-sheet-title');
  const content = document.getElementById('bottom-sheet-content');

  if (type === 'audit') {
    title.textContent = "Statutory Multi-Agency Audit Trail";
    content.innerHTML = `
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">1. Physical Customs Records</span>
          <p class="text-xs text-white font-medium mt-0.5">DGCI&S Ministry of Commerce & Industry</p>
          <p class="text-[11px] text-neutral-400">Valued at FOB (Free on Board) at Indian sea and air ports.</p>
          <a href="https://tradestat.commerce.gov.in" target="_blank" class="text-amber-400 text-[11px] font-semibold underline block mt-1">Verify at tradestat.commerce.gov.in &rarr;</a>
        </div>
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">2. Financial Settlements & BoP</span>
          <p class="text-xs text-white font-medium mt-0.5">Reserve Bank of India (RBI DBIE)</p>
          <p class="text-[11px] text-neutral-400">IMF BPM6 standard tracking foreign exchange currency inflows.</p>
          <a href="https://dbie.rbi.org.in" target="_blank" class="text-emerald-400 text-[11px] font-semibold underline block mt-1">Verify at dbie.rbi.org.in &rarr;</a>
        </div>
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">3. Partner Mirror Declarations</span>
          <p class="text-xs text-white font-medium mt-0.5">United Nations Comtrade Database</p>
          <p class="text-[11px] text-neutral-400">Reconciles foreign destination customs CIF spread (6%–9% freight).</p>
          <a href="https://comtradeplus.un.org" target="_blank" class="text-blue-400 text-[11px] font-semibold underline block mt-1">Verify at comtradeplus.un.org &rarr;</a>
        </div>
      </div>
    `;
  } else if (type === 'claiming') {
    title.textContent = "3-Step ICEGATE Claiming Guide";
    content.innerHTML = `
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-amber-400 font-bold block">STEP 1 &bull; Port Shipping Bill</span>
          <p class="text-xs text-white font-medium mt-0.5">Mark RoDTEP & Drawback on Shipping Bill</p>
          <p class="text-[11px] text-neutral-400 mt-1">Ensure your CHA/Customs Broker marks Scheme Code 'RoDTEP & Drawback' on the export declaration bill.</p>
        </div>
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-emerald-400 font-bold block">STEP 2 &bull; 72-Hour Bank Credit</span>
          <p class="text-xs text-white font-medium mt-0.5">Automated EDI Drawback Scroll</p>
          <p class="text-[11px] text-neutral-400 mt-1">Indian Customs automatically disburses the Drawback cash amount directly into your linked bank account via PFMS/EDI.</p>
        </div>
        <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <span class="text-[10px] text-purple-400 font-bold block">STEP 3 &bull; Electronic Scrip</span>
          <p class="text-xs text-white font-medium mt-0.5">ICEGATE Scrip Generation</p>
          <p class="text-[11px] text-neutral-400 mt-1">Log in to ICEGATE.gov.in &rarr; Duty Credit Ledger. Generate your scrip to pay taxes or transfer it for 100% cash.</p>
        </div>
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

// 7. LIVE TRADE COUNTDOWN CLOCKS (Timer Tab)
function updateTimers() {
  // Mandi Timer
  if (mandiSecondsLeft > 0) {
    mandiSecondsLeft--;
    const h = String(Math.floor(mandiSecondsLeft / 3600)).padStart(2, '0');
    const m = String(Math.floor((mandiSecondsLeft % 3600) / 60)).padStart(2, '0');
    const s = String(mandiSecondsLeft % 60).padStart(2, '0');
    const el = document.getElementById('mandi-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }

  // e-Way Timer
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
}

// Run timer loop every second
setInterval(updateTimers, 1000);

// Initial Load: Default trade pulse query
window.addEventListener('DOMContentLoaded', () => {
  setQuery("What are India's overall trade totals and deficit?");
});
