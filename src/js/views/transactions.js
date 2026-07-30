/* ============================================================
   transactions.js — Global transaction history with filters
   ============================================================ */

import { state, transactionsByCountry } from '../state.js';
import { CONFIG } from '../config.js';
import { el, formatMoney, fmtDate, esc, debounce } from '../utils.js';
import { emptyState } from './dashboard.js';

export function renderTransactionsView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Transaction History</div><div class="section-sub">All transactions across accounts</div></div>`;
  content.append(head);

  const filters = el('div', { class: 'filters' });
  const countrySel = el('select', { id: 'tx-country' });
  countrySel.innerHTML = `<option value="ALL">All Countries</option><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option>`;
  countrySel.value = state.currentCountry === 'ALL' ? 'ALL' : state.currentCountry;
  const typeSel = el('select', { id: 'tx-type' });
  typeSel.innerHTML = `<option value="">All Types</option>` + CONFIG.TRANSACTION_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
  const catSel = el('select', { id: 'tx-cat' });
  catSel.innerHTML = `<option value="">All Categories</option>` + CONFIG.CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  const dateSel = el('select', { id: 'tx-date' });
  dateSel.innerHTML = `<option value="">All Dates</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lmonth">Last Month</option>`;
  const search = el('input', { type: 'search', class: 'search', placeholder: 'Search description, recipient, ID…' });
  filters.append(countrySel, typeSel, catSel, dateSel, search);
  content.append(filters);

  const host = el('div', { id: 'tx-host' });
  content.append(host);

  function rerender() {
    const country = countrySel.value;
    const type = typeSel.value;
    const cat = catSel.value;
    const dateF = dateSel.value;
    const q = search.value.trim().toLowerCase();
    let list = transactionsByCountry(country).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (type) list = list.filter((t) => t.type === type);
    if (cat) list = list.filter((t) => t.category === cat);
    if (q) list = list.filter((t) => `${t.description} ${t.id} ${t.recipient}`.toLowerCase().includes(q));
    if (dateF) {
      const now = new Date();
      list = list.filter((t) => {
        const d = new Date(t.date);
        if (dateF === 'today') return d.toDateString() === now.toDateString();
        if (dateF === 'week') { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return d >= s; }
        if (dateF === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (dateF === 'lmonth') { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
        return true;
      });
    }
    host.innerHTML = '';
    if (!list.length) { host.append(emptyState('No transactions', 'Try adjusting filters.')); return; }
    const wrap = el('div', { class: 'table-wrap' });
    wrap.innerHTML = `<table><thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Category</th><th>Type</th><th class="tnum">Amount</th></tr></thead><tbody></tbody></table>`;
    const tb = wrap.querySelector('tbody');
    list.forEach((t) => {
      const acct = state.accounts.find((a) => a.id === t.accountId);
      const tr = el('tr');
      // BUG FIX: was setting tr.children[4].textContent = t.type which overwrote
      // the <span class="badge ..."> inside the <td>, losing the badge styling.
      // Now we set the textContent on the inner <span> directly.
      tr.innerHTML = `<td></td><td></td><td></td><td></td><td><span class="badge ${badgeClass(t.type)}"></span></td><td class="tnum"></td>`;
      tr.children[0].textContent = fmtDate(t.date);
      tr.children[1].textContent = acct ? `${acct.institution || acct.type}` : '—';
      tr.children[2].textContent = t.description || '';
      tr.children[3].textContent = t.category || '';
      tr.children[4].querySelector('span').textContent = t.type;
      tr.children[5].textContent = formatMoney(t.amount, t.currency);
      tr.children[5].classList.add(t.type === 'Income' || t.type === 'Deposit' ? 'pos' : 'neg');
      tb.append(tr);
    });
    host.append(wrap);
  }
  [countrySel, typeSel, catSel, dateSel].forEach((s) => s.addEventListener('change', rerender));
  search.addEventListener('input', debounce(rerender, 200));
  rerender();
}

function badgeClass(type) {
  const map = { Income: 'badge-income', Expense: 'badge-expense', Transfer: 'badge-transfer', Deposit: 'badge-deposit', Withdrawal: 'badge-withdrawal', Fee: 'badge-fee', 'Loan Payment': 'badge-loan', 'Receivable Payment': 'badge-loan' };
  return map[type] || 'badge-neutral';
}
