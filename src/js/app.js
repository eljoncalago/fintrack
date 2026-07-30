/* ============================================================
   app.js — Application entry point
   Initializes, bootstraps data from API, renders UI.
   ============================================================ */

import { CONFIG } from './config.js';
import { state, applyBootstrap } from './state.js';
import { api } from './api/api.js';
import { goTo } from './router.js';
import { nextLoadingStep, hideLoading } from './components/loading.js';
import { toast } from './components/ui.js';
import { el } from './utils.js';

const NAV = [
  { group: 'Main', items: [{ v: 'dashboard', l: 'Dashboard', i: '🏠' }] },
  { group: 'Accounts', items: [{ v: 'accounts', l: 'Accounts', i: '🏦' }] },
  { group: 'Liabilities', items: [{ v: 'loans', l: 'Loans', i: '💸' }, { v: 'receivables', l: 'Receivables', i: '📝' }] },
  { group: 'Activity', items: [{ v: 'transactions', l: 'Transactions', i: '📄' }, { v: 'transfers', l: 'Transfers', i: '⇄' }] },
  { group: 'Insights', items: [{ v: 'reports', l: 'Reports', i: '📊' }, { v: 'settings', l: 'Settings', i: '⚙️' }] },
];

export async function refreshData() {
  setSync('syncing');
  try {
    const data = await api('bootstrap');
    applyBootstrap(data.data || data);
    setSync('ok');
  } catch (e) {
    setSync('error');
    throw e;
  }
}

function setSync(status) {
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (!dot) return;
  dot.className = 'sidebar-footer-dot';
  if (status === 'syncing') { dot.classList.add('syncing'); label.textContent = 'Syncing…'; }
  else if (status === 'error') { dot.classList.add('error'); label.textContent = 'Sync error'; }
  else { label.textContent = 'Synced'; }
}

function buildNav() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  NAV.forEach((section) => {
    const group = el('div', { class: 'nav-group' });
    group.append(el('div', { class: 'nav-group-label' }, section.group));
    section.items.forEach((item) => {
      const btn = el('button', { class: 'nav-item', 'data-view': item.v });
      btn.innerHTML = `<span class="nav-ico">${item.i}</span><span>${item.l}</span>`;
      btn.addEventListener('click', () => goTo(item.v));
      group.append(btn);
    });
    nav.append(group);
  });
}

function bindChrome() {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    try { await refreshData(); toast('Data refreshed.', 'success'); goTo(state.currentView); }
    catch (e) { toast(e.message, 'error'); }
  });
}

async function init() {
  // Step through loading
  nextLoadingStep();
  buildNav();
  bindChrome();

  try {
    nextLoadingStep();
    await refreshData();
    nextLoadingStep();
    // apply default country from settings
    if (state.settings.defaultCountry) state.currentCountry = state.settings.defaultCountry;
    document.getElementById('app').classList.remove('hidden');
    hideLoading();
    goTo('dashboard');
  } catch (e) {
    console.error('Bootstrap failed:', e);
    // Show error but reveal app shell with retry
    document.getElementById('app').classList.remove('hidden');
    hideLoading();
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card card-pad empty" style="max-width:520px;margin:40px auto">
        <div class="empty-ico" style="color:var(--error)">⚠</div>
        <div class="empty-title">Could not load your data</div>
        <div class="empty-sub"></div>
        <button class="btn btn-primary mt-2" id="retry-btn">Retry</button>
      </div>`;
    content.querySelector('.empty-sub').textContent = e.message || 'Check that your Apps Script API URL is set in src/js/config.js and the web app is deployed.';
    content.querySelector('#retry-btn').addEventListener('click', () => init());
    toast(e.message, 'error', 6000);
  }
}

init();
