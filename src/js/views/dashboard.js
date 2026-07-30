/* ============================================================
   dashboard.js — Main dashboard with country selector & summary
   ============================================================ */

import { state, accountsByCountry, transactionsByCountry, loansByCountry, receivablesByCountry } from '../state.js';
import { CONFIG } from '../config.js';
import { el, formatMoney, countryMeta, fmtDate, sum, logoFor, esc } from '../utils.js';
import { toast } from '../components/ui.js';
import { renderAccountsView } from './accounts.js';
import { goTo } from '../router.js';

export function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  // Country selector
  const tabs = el('div', { class: 'country-tabs' });
  ['TH', 'PH', 'ALL'].forEach((code) => {
    const meta = countryMeta(code === 'ALL' ? 'TH' : code);
    const label = code === 'ALL' ? '🌍 All Countries' : `${meta.flag} ${meta.name}`;
    const t = el('button', { class: `country-tab ${state.currentCountry === code ? 'active' : ''}` }, label);
    t.addEventListener('click', () => { state.currentCountry = code; renderDashboard(); });
    tabs.append(t);
  });
  content.append(tabs);

  if (state.currentCountry === 'ALL') {
    renderCountrySection('TH');
    renderCountrySection('PH');
  } else {
    renderCountrySection(state.currentCountry);
  }
}

function renderCountrySection(country) {
  const meta = countryMeta(country);
  const content = document.getElementById('content');
  const section = el('div', { class: 'mb-4' });
  section.innerHTML = `<div class="section-head"><div><div class="section-title">${meta.flag} ${meta.name}</div><div class="section-sub">Currency: ${meta.currency} (${meta.symbol})</div></div></div>`;

  const accounts = accountsByCountry(country);
  const txns = transactionsByCountry(country);
  const loans = loansByCountry(country);
  const receivables = receivablesByCountry(country);

  // Summary cards
  const bank = accounts.filter((a) => a.type === 'Bank Account');
  const wallet = accounts.filter((a) => a.type === 'E-Wallet');
  const cash = accounts.filter((a) => a.type === 'Cash');
  const credit = accounts.filter((a) => a.type === 'Credit Card');
  const savings = accounts.filter((a) => a.type === 'Savings');
  const invest = accounts.filter((a) => a.type === 'Investment');

  const bal = (arr) => sum(arr, 'balance');
  const grid = el('div', { class: 'grid grid-4 mb-4' });
  grid.append(
    statCard('Total Bank Balance', meta.currency, bal(bank), country),
    statCard('Total E-Wallet', meta.currency, bal(wallet), country),
    statCard('Total Cash', meta.currency, bal(cash), country),
    statCard('Credit Card Outstanding', meta.currency, Math.abs(bal(credit)), country),
    statCard('Savings', meta.currency, bal(savings), country),
    statCard('Investments', meta.currency, bal(invest), country),
    statCard('Loans Balance', meta.currency, sum(loans.filter(l=>l.direction==='Money I Owe'), 'balance'), country),
    statCard('Receivables', meta.currency, sum(receivables, 'remaining'), country),
  );
  section.append(grid);

  // Income vs Expense (this month)
  const now = new Date();
  const monthTxns = txns.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = sum(monthTxns.filter((t) => t.type === 'Income' || t.type === 'Deposit'), 'amount');
  const expense = sum(monthTxns.filter((t) => t.type === 'Expense' || t.type === 'Withdrawal' || t.type === 'Fee'), 'amount');
  const ieGrid = el('div', { class: 'grid grid-3 mb-4' });
  ieGrid.append(
    statCard('Income (this month)', meta.currency, income, country, 'success'),
    statCard('Expense (this month)', meta.currency, expense, country, 'danger'),
    statCard('Net', meta.currency, income - expense, country, income - expense >= 0 ? 'success' : 'danger'),
  );
  section.append(ieGrid);

  // Notifications / reminders
  const notifs = state.notifications.filter((n) => n.country === country || country === 'ALL');
  if (notifs.length) {
    const card = el('div', { class: 'card card-pad mb-4' });
    card.innerHTML = '<div class="card-title">Reminders & Alerts</div>';
    const list = el('div');
    notifs.forEach((n) => {
      const row = el('div', { class: 'kv' });
      row.innerHTML = `<span class="kv-key">${esc(n.title)} — ${fmtDate(n.date)}</span><span class="kv-val ${n.severity === 'danger' ? 'neg' : n.severity === 'warning' ? '' : 'pos'}">${esc(n.message || '')}</span>`;
      list.append(row);
    });
    card.append(list);
    section.append(card);
  }

  // Recent accounts
  if (accounts.length) {
    const head = el('div', { class: 'section-head' }, [
      el('div', {}, [el('div', { class: 'text-lg text-bold' }, 'Your Accounts')]),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => goTo('accounts') }, 'View all →'),
    ]);
    section.append(head);
    const grid2 = el('div', { class: 'grid grid-auto' });
    accounts.slice(0, 6).forEach((a) => grid2.append(accountCard(a)));
    section.append(grid2);
  } else {
    section.append(emptyState('No accounts yet', 'Add your first account to get started.', 'Add Account', () => goTo('accounts')));
  }

  content.append(section);
}

function statCard(label, currency, value, country, tone) {
  const c = el('div', { class: `stat-card ${country.toLowerCase()}` });
  const valClass = tone === 'success' ? 'pos' : tone === 'danger' ? 'neg' : '';
  c.innerHTML = `<div class="stat-label"></div><div class="stat-value ${valClass}"></div>`;
  c.querySelector('.stat-label').textContent = label;
  c.querySelector('.stat-value').textContent = formatMoney(value, currency);
  return c;
}

export function accountCard(a) {
  const meta = countryMeta(a.country);
  const card = el('div', { class: 'acct-card' });
  card.innerHTML = `
    <div class="acct-head">
      <div class="acct-logo">${logoFor(a.institution || a.type)}</div>
      <div>
        <div class="acct-name"></div>
        <div class="acct-type"></div>
      </div>
    </div>
    <div class="acct-meta"><span class="flag">${meta.flag}</span> · ${meta.currency}</div>
    <div class="acct-balance"></div>
    <div class="acct-num"></div>
    <div class="acct-actions">
      <button class="btn btn-ghost btn-sm" data-act="pay">Pay</button>
      <button class="btn btn-ghost btn-sm" data-act="transfer">Transfer</button>
      <button class="btn btn-ghost btn-sm" data-act="history">History</button>
    </div>
  `;
  card.querySelector('.acct-name').textContent = a.institution || a.type;
  card.querySelector('.acct-type').textContent = a.accountName || a.type;
  card.querySelector('.acct-balance').textContent = formatMoney(a.balance, a.currency);
  card.querySelector('.acct-num').textContent = a.accountNumber ? `•••• ${esc(String(a.accountNumber).slice(-4))}` : '';
  card.addEventListener('click', (e) => {
    if (e.target.closest('[data-act]')) return;
    import('./accounts.js').then(({ openAccountDetail }) => openAccountDetail(a.id));
  });
  card.querySelector('[data-act="pay"]').addEventListener('click', (e) => { e.stopPropagation(); import('./accounts.js').then(({ openPayment }) => openPayment(a.id)); });
  card.querySelector('[data-act="transfer"]').addEventListener('click', (e) => { e.stopPropagation(); goTo('transfers'); });
  card.querySelector('[data-act="history"]').addEventListener('click', (e) => { e.stopPropagation(); import('./accounts.js').then(({ openAccountDetail }) => openAccountDetail(a.id)); });
  return card;
}

export function emptyState(title, sub, btnLabel, onClick) {
  const wrap = el('div', { class: 'card card-pad empty' });
  wrap.innerHTML = `<div class="empty-ico">◇</div><div class="empty-title"></div><div class="empty-sub"></div>`;
  wrap.querySelector('.empty-title').textContent = title;
  wrap.querySelector('.empty-sub').textContent = sub;
  if (btnLabel) {
    const b = el('button', { class: 'btn btn-primary mt-2' }, btnLabel);
    b.addEventListener('click', onClick);
    wrap.append(b);
  }
  return wrap;
}
