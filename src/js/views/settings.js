/* ============================================================
   settings.js — App settings + exchange rates
   ============================================================ */

import { state } from '../state.js';
import { el, esc, fmtDate } from '../utils.js';
import { modal, toast, withLoading } from '../components/ui.js';
import { api } from '../api/api.js';
import { refreshData } from '../app.js';

export function renderSettingsView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Settings</div><div class="section-sub">App preferences and exchange rates</div></div>`;
  content.append(head);

  // General settings
  const card = el('div', { class: 'card card-pad mb-4' });
  card.innerHTML = `<div class="card-title">General</div>`;
  const grid = el('div', { class: 'form-grid' });
  grid.innerHTML = `
    <div class="form-field">
      <label>App Name</label>
      <input id="s-appname" type="text" />
    </div>
    <div class="form-field">
      <label>Default Country</label>
      <select id="s-country"><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option></select>
    </div>
    <div class="form-field full">
      <label>Owner Name</label>
      <input id="s-owner" type="text" />
    </div>
  `;
  grid.querySelector('#s-appname').value = state.settings.appName || 'FinTrack';
  grid.querySelector('#s-country').value = state.settings.defaultCountry || 'TH';
  grid.querySelector('#s-owner').value = state.settings.owner || '';
  const saveBtn = el('button', { class: 'btn btn-primary mt-2' }, 'Save Settings');
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    try {
      await api('settings/update', {
        appName: grid.querySelector('#s-appname').value,
        defaultCountry: grid.querySelector('#s-country').value,
        owner: grid.querySelector('#s-owner').value,
      });
      toast('Settings saved.', 'success');
      await refreshData();
      renderSettingsView();
    } catch (e) { toast(e.message, 'error'); }
  }));
  card.append(grid, saveBtn);
  content.append(card);

  // Exchange rates
  const rateCard = el('div', { class: 'card card-pad mb-4' });
  rateCard.innerHTML = `<div class="card-title">Exchange Rates</div><div class="text-soft text-sm mb-2">Reference rates used for cross-currency transfers. The exact rate is stored per transfer.</div>`;
  const rateGrid = el('div', { class: 'form-grid' });
  rateGrid.innerHTML = `
    <div class="form-field">
      <label>1 THB = ? PHP</label>
      <input id="s-thbphp" type="number" step="0.0001" />
    </div>
    <div class="form-field">
      <label>1 PHP = ? THB</label>
      <input id="s-phpthb" type="number" step="0.0001" />
    </div>
  `;
  const thbphp = state.exchangeRates.find((r) => r.from === 'THB' && r.to === 'PHP');
  const phpthb = state.exchangeRates.find((r) => r.from === 'PHP' && r.to === 'THB');
  rateGrid.querySelector('#s-thbphp').value = thbphp?.rate || '';
  rateGrid.querySelector('#s-phpthb').value = phpthb?.rate || '';
  const rateBtn = el('button', { class: 'btn btn-primary mt-2' }, 'Save Rates');
  rateBtn.addEventListener('click', withLoading(rateBtn, async () => {
    try {
      await api('exchange-rates/update', {
        rates: [
          { from: 'THB', to: 'PHP', rate: Number(rateGrid.querySelector('#s-thbphp').value) || 0 },
          { from: 'PHP', to: 'THB', rate: Number(rateGrid.querySelector('#s-phpthb').value) || 0 },
        ],
      });
      toast('Rates saved.', 'success');
      await refreshData();
      renderSettingsView();
    } catch (e) { toast(e.message, 'error'); }
  }));
  rateCard.append(rateGrid, rateBtn);
  content.append(rateCard);

  // Data info
  const infoCard = el('div', { class: 'card card-pad' });
  infoCard.innerHTML = `<div class="card-title">Data Summary</div>`;
  const info = el('div');
  info.innerHTML = `
    <div class="kv"><span class="kv-key">Accounts</span><span class="kv-val">${state.accounts.length}</span></div>
    <div class="kv"><span class="kv-key">Transactions</span><span class="kv-val">${state.transactions.length}</span></div>
    <div class="kv"><span class="kv-key">Transfers</span><span class="kv-val">${state.transfers.length}</span></div>
    <div class="kv"><span class="kv-key">Loans</span><span class="kv-val">${state.loans.length}</span></div>
    <div class="kv"><span class="kv-key">Loan Payments</span><span class="kv-val">${state.loanPayments.length}</span></div>
    <div class="kv"><span class="kv-key">Receivables</span><span class="kv-val">${state.receivables.length}</span></div>
    <div class="kv"><span class="kv-key">Notifications</span><span class="kv-val">${state.notifications.length}</span></div>
  `;
  infoCard.append(info);
  content.append(infoCard);
}
