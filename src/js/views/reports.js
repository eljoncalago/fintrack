/* ============================================================
   reports.js — Simple financial reports / summaries
   ============================================================ */

import { state, accountsByCountry, transactionsByCountry, loansByCountry, receivablesByCountry } from '../state.js';
import { el, formatMoney, countryMeta, sum } from '../utils.js';
import { emptyState } from './dashboard.js';

export function renderReportsView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Reports</div><div class="section-sub">Financial summary by country</div></div>`;
  content.append(head);

  ['TH', 'PH'].forEach((country) => {
    const meta = countryMeta(country);
    const section = el('div', { class: 'mb-4' });
    section.innerHTML = `<div class="section-head"><div class="section-title">${meta.flag} ${meta.name}</div></div>`;

    const accounts = accountsByCountry(country);
    const txns = transactionsByCountry(country);
    const loans = loansByCountry(country);
    const receivables = receivablesByCountry(country);

    const income = sum(txns.filter((t) => t.type === 'Income' || t.type === 'Deposit'), 'amount');
    const expense = sum(txns.filter((t) => t.type === 'Expense' || t.type === 'Withdrawal' || t.type === 'Fee'), 'amount');

    const grid = el('div', { class: 'grid grid-4' });
    grid.append(stat('Total Assets', sum(accounts.filter(a=>a.type!=='Credit Card'), 'balance'), meta.currency, country));
    grid.append(stat('Total Income', income, meta.currency, country, 'pos'));
    grid.append(stat('Total Expense', expense, meta.currency, country, 'neg'));
    grid.append(stat('Net Cash Flow', income - expense, meta.currency, country, income-expense>=0?'pos':'neg'));
    grid.append(stat('Loans Owed', sum(loans.filter(l=>l.direction==='Money I Owe'), 'balance'), meta.currency, country, 'neg'));
    grid.append(stat('Loans Receivable', sum(loans.filter(l=>l.direction==='Money Owed To Me'), 'balance'), meta.currency, country, 'pos'));
    grid.append(stat('Receivables', sum(receivables, 'remaining'), meta.currency, country, 'pos'));
    grid.append(stat('Credit Outstanding', Math.abs(sum(accounts.filter(a=>a.type==='Credit Card'), 'balance')), meta.currency, country, 'neg'));
    section.append(grid);

    // Category breakdown
    if (txns.length) {
      const byCat = {};
      txns.filter((t) => t.type === 'Expense').forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + (Number(t.amount) || 0); });
      const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      if (cats.length) {
        const card = el('div', { class: 'card card-pad mt-2' });
        card.innerHTML = `<div class="card-title">Expense by Category</div>`;
        const list = el('div');
        cats.forEach(([cat, amt]) => {
          const row = el('div', { class: 'kv' });
          row.innerHTML = `<span class="kv-key">${cat}</span><span class="kv-val neg">${formatMoney(amt, meta.currency)}</span>`;
          list.append(row);
        });
        card.append(list);
        section.append(card);
      }
    }

    content.append(section);
  });

  if (!state.accounts.length && !state.transactions.length) {
    content.append(emptyState('No data yet', 'Add accounts and transactions to see reports.'));
  }
}

function stat(label, value, currency, country, tone) {
  const c = el('div', { class: `stat-card ${country.toLowerCase()}` });
  const cls = tone === 'pos' ? 'pos' : tone === 'neg' ? 'neg' : '';
  c.innerHTML = `<div class="stat-label"></div><div class="stat-value ${cls}"></div>`;
  c.querySelector('.stat-label').textContent = label;
  c.querySelector('.stat-value').textContent = formatMoney(value, currency);
  return c;
}
