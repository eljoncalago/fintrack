/* ============================================================
   accounts.js — Account list, add/edit, detail, pay, deposit, withdraw
   ============================================================ */

import { state, accountsByCountry, transactionsByAccount, accountById } from '../state.js';
import { CONFIG } from '../config.js';
import { el, formatMoney, countryMeta, fmtDate, todayISO, logoFor, esc, debounce } from '../utils.js';
import { modal, toast, confirmDialog, withLoading } from '../components/ui.js';
import { api } from '../api/api.js';
import { refreshData } from '../app.js';
import { accountCard, emptyState } from './dashboard.js';

export function renderAccountsView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Accounts</div><div class="section-sub">Bank, e-wallets, cash, cards, savings & investments</div></div>`;
  const addBtn = el('button', { class: 'btn btn-primary' }, '+ Add Account');
  addBtn.addEventListener('click', () => openAccountForm());
  head.append(addBtn);
  content.append(head);

  // Filter by country
  const filters = el('div', { class: 'filters' });
  const countrySel = el('select', { id: 'acct-country-filter' });
  countrySel.innerHTML = `<option value="ALL">All Countries</option><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option>`;
  countrySel.value = state.currentCountry === 'ALL' ? 'ALL' : state.currentCountry;
  const typeSel = el('select', { id: 'acct-type-filter' });
  typeSel.innerHTML = `<option value="">All Types</option>` + CONFIG.ACCOUNT_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
  const search = el('input', { type: 'search', class: 'search', placeholder: 'Search institution, name, number…' });
  filters.append(countrySel, typeSel, search);
  content.append(filters);

  const gridHost = el('div', { id: 'acct-grid' });
  content.append(gridHost);

  function rerender() {
    const country = countrySel.value;
    const type = typeSel.value;
    const q = search.value.trim().toLowerCase();
    let list = accountsByCountry(country);
    if (type) list = list.filter((a) => a.type === type);
    if (q) list = list.filter((a) => `${a.institution} ${a.accountName} ${a.accountNumber}`.toLowerCase().includes(q));
    gridHost.innerHTML = '';
    if (!list.length) { gridHost.append(emptyState('No accounts', 'Add an account to begin.', 'Add Account', () => openAccountForm())); return; }
    const grid = el('div', { class: 'grid grid-auto' });
    list.forEach((a) => grid.append(accountCard(a)));
    gridHost.append(grid);
  }
  countrySel.addEventListener('change', rerender);
  typeSel.addEventListener('change', rerender);
  search.addEventListener('input', debounce(rerender, 200));
  rerender();
}

/* ---------- Add / Edit account form ---------- */
export function openAccountForm(existing) {
  const a = existing || {};
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field">
      <label>Country</label>
      <select id="f-country">
        <option value="TH">🇹🇭 Thailand (THB)</option>
        <option value="PH">🇵🇭 Philippines (PHP)</option>
      </select>
    </div>
    <div class="form-field">
      <label>Account Type</label>
      <select id="f-type">${CONFIG.ACCOUNT_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
    </div>
    <div class="form-field full">
      <label>Institution / Provider</label>
      <select id="f-inst"></select>
    </div>
    <div class="form-field">
      <label>Account Name</label>
      <input id="f-acctname" type="text" placeholder="e.g. Personal Savings" />
    </div>
    <div class="form-field">
      <label>Account Holder</label>
      <input id="f-holder" type="text" placeholder="Account holder name" />
    </div>
    <div class="form-field">
      <label>Account Number</label>
      <input id="f-number" type="text" placeholder="Account number" />
    </div>
    <div class="form-field">
      <label>Currency</label>
      <input id="f-currency" type="text" />
    </div>
    <div class="form-field">
      <label>Initial Balance</label>
      <input id="f-balance" type="number" step="0.01" value="0" />
    </div>
    <div class="form-field">
      <label>Opening Date</label>
      <input id="f-date" type="date" />
    </div>
    <div class="form-field full">
      <label>Notes</label>
      <textarea id="f-notes" rows="2"></textarea>
    </div>
  `;

  // populate
  const countrySel = form.querySelector('#f-country');
  const typeSel = form.querySelector('#f-type');
  const instSel = form.querySelector('#f-inst');
  const currencyInp = form.querySelector('#f-currency');

  function updateInstitutions() {
    const country = countrySel.value;
    const type = typeSel.value;
    let opts = [];
    if (type === 'Bank Account') opts = CONFIG.INSTITUTIONS[country].banks.map((b) => ({ v: b, l: b }));
    else if (type === 'E-Wallet') opts = CONFIG.INSTITUTIONS[country].wallets.map((w) => ({ v: w, l: w }));
    else opts = [{ v: 'Cash', l: '💵 Cash' }, { v: 'Other', l: 'Other' }];
    instSel.innerHTML = opts.map((o) => `<option value="${o.v}">${o.l}</option>`).join('') + (existing ? '' : '');
    if (existing && existing.institution) {
      if (![...instSel.options].some((o) => o.value === existing.institution)) {
        instSel.insertAdjacentHTML('beforeend', `<option value="${esc(existing.institution)}" selected>${esc(existing.institution)}</option>`);
      }
    }
  }
  function updateCurrency() {
    currencyInp.value = CONFIG.COUNTRIES[countrySel.value].currency;
  }
  countrySel.addEventListener('change', () => { updateInstitutions(); updateCurrency(); });
  typeSel.addEventListener('change', updateInstitutions);
  updateInstitutions(); updateCurrency();

  if (existing) {
    countrySel.value = existing.country || 'TH';
    typeSel.value = existing.type || 'Bank Account';
    updateInstitutions();
    if (existing.institution) instSel.value = existing.institution;
    form.querySelector('#f-acctname').value = existing.accountName || '';
    form.querySelector('#f-holder').value = existing.holder || '';
    form.querySelector('#f-number').value = existing.accountNumber || '';
    form.querySelector('#f-currency').value = existing.currency || '';
    form.querySelector('#f-balance').value = existing.balance || 0;
    form.querySelector('#f-date').value = existing.openingDate || todayISO();
    form.querySelector('#f-notes').value = existing.notes || '';
  } else {
    form.querySelector('#f-date').value = todayISO();
  }

  const saveBtn = el('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create Account');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: existing ? 'Edit Account' : 'Add Account', body: form, footer: [cancelBtn, saveBtn], size: 'lg' });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const payload = {
      id: existing?.id,
      country: countrySel.value,
      type: typeSel.value,
      institution: instSel.value,
      accountName: form.querySelector('#f-acctname').value.trim(),
      holder: form.querySelector('#f-holder').value.trim(),
      accountNumber: form.querySelector('#f-number').value.trim(),
      currency: form.querySelector('#f-currency').value,
      balance: Number(form.querySelector('#f-balance').value) || 0,
      openingDate: form.querySelector('#f-date').value,
      notes: form.querySelector('#f-notes').value.trim(),
    };
    try {
      await api(existing ? 'accounts/update' : 'accounts/create', payload);
      toast('Account saved.', 'success');
      m.close();
      await refreshData();
      renderAccountsView();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Account detail ---------- */
export function openAccountDetail(id) {
  const a = accountById(id);
  if (!a) { toast('Account not found.', 'error'); return; }
  const meta = countryMeta(a.country);
  const txns = transactionsByAccount(id).sort((x, y) => new Date(y.date) - new Date(x.date));

  const body = el('div');
  body.innerHTML = `
    <div class="card card-pad mb-4">
      <div class="flex items-center gap-4">
        <div class="acct-logo" style="width:56px;height:56px;font-size:28px">${logoFor(a.institution || a.type)}</div>
        <div>
          <div class="text-lg text-bold"></div>
          <div class="text-soft text-sm"></div>
          <div class="text-mute text-sm"></div>
        </div>
        <div class="spacer"></div>
        <div class="text-right">
          <div class="text-soft text-sm">Balance</div>
          <div class="text-bold" style="font-size:26px;font-family:var(--font-display)"></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-success btn-sm" data-act="income">+ Income</button>
        <button class="btn btn-ghost btn-sm" data-act="pay">Pay</button>
        <button class="btn btn-ghost btn-sm" data-act="deposit">Deposit</button>
        <button class="btn btn-ghost btn-sm" data-act="withdraw">Withdraw</button>
        <button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>
        <button class="btn btn-danger btn-sm" data-act="delete">Delete</button>
      </div>
    </div>
    <div class="card card-pad">
      <div class="card-title">Transaction History</div>
      <div id="acct-txns"></div>
    </div>
  `;
  body.querySelector('.text-lg').textContent = a.institution || a.type;
  body.querySelector('.text-soft').textContent = `${a.accountName || a.type} · ${a.accountNumber || ''}`;
  body.querySelector('.text-mute').textContent = `${meta.flag} ${meta.name} · ${a.currency}`;
  body.querySelector('.text-bold:last-child').textContent = formatMoney(a.balance, a.currency);

  const txnsHost = body.querySelector('#acct-txns');
  if (!txns.length) {
    txnsHost.append(emptyState('No transactions', 'Make a payment or deposit to see history here.'));
  } else {
    const wrap = el('div', { class: 'table-wrap' });
    wrap.innerHTML = `<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th class="tnum">Amount</th><th class="tnum">Balance</th></tr></thead><tbody></tbody></table>`;
    const tb = wrap.querySelector('tbody');
    txns.forEach((t) => {
      const tr = el('tr');
      tr.innerHTML = `<td></td><td></td><td></td><td><span class="badge ${badgeClass(t.type)}"></span></td><td class="tnum"></td><td class="tnum"></td>`;
      tr.children[0].textContent = fmtDate(t.date);
      tr.children[1].textContent = t.description || '';
      tr.children[2].textContent = t.category || '';
      tr.children[3].textContent = t.type;
      tr.children[4].textContent = formatMoney(t.amount, t.currency);
      tr.children[4].classList.add(t.type === 'Income' || t.type === 'Deposit' ? 'pos' : 'neg');
      tr.children[5].textContent = formatMoney(t.balanceAfter, t.currency);
      tb.append(tr);
    });
    txnsHost.append(wrap);
  }

  // actions
  body.querySelector('[data-act="income"]').addEventListener('click', () => openTransaction(a.id, 'Income'));
  body.querySelector('[data-act="pay"]').addEventListener('click', () => openPayment(a.id));
  body.querySelector('[data-act="deposit"]').addEventListener('click', () => openTransaction(a.id, 'Deposit'));
  body.querySelector('[data-act="withdraw"]').addEventListener('click', () => openTransaction(a.id, 'Withdrawal'));
  body.querySelector('[data-act="edit"]').addEventListener('click', () => openAccountForm(a));
  body.querySelector('[data-act="delete"]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Delete account?', message: 'This will remove the account and its transactions. This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try { await api('accounts/delete', { id: a.id }); toast('Account deleted.', 'success'); m.close(); await refreshData(); renderAccountsView(); }
    catch (e) { toast(e.message, 'error'); }
  });

  const m = modal({ title: 'Account Details', body, size: 'lg' });
}

/* ---------- Payment / transaction form ---------- */
export function openPayment(accountId) { openTransaction(accountId, 'Expense'); }

export function openTransaction(accountId, type) {
  const a = accountById(accountId);
  if (!a) return;
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field full">
      <label>Account</label>
      <input type="text" disabled value="${esc(a.institution || a.type)} — ${formatMoney(a.balance, a.currency)}" />
    </div>
    <div class="form-field">
      <label>Type</label>
      <select id="t-type">${CONFIG.TRANSACTION_TYPES.map((t) => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Amount (${a.currency})</label>
      <input id="t-amount" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Category</label>
      <select id="t-category">${CONFIG.CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Date</label>
      <input id="t-date" type="date" value="${todayISO()}" />
    </div>
    <div class="form-field full">
      <label>Description / Recipient</label>
      <input id="t-desc" type="text" placeholder="What was this for?" />
    </div>
    <div class="form-field full">
      <label>Notes</label>
      <textarea id="t-notes" rows="2"></textarea>
    </div>
    <div class="form-field full">
      <label>Attachment (receipt/proof)</label>
      <input id="t-file" type="file" accept="image/*,application/pdf" />
    </div>
  `;
  const saveBtn = el('button', { class: 'btn btn-primary' }, 'Save Transaction');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: `${type} — ${a.institution || a.type}`, body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const file = form.querySelector('#t-file').files[0];
    let attachment = null;
    if (file) {
      const b64 = await fileToBase64(file);
      attachment = { name: file.name, mime: file.type, data: b64 };
    }
    const payload = {
      accountId: a.id,
      type: form.querySelector('#t-type').value,
      amount: Number(form.querySelector('#t-amount').value) || 0,
      category: form.querySelector('#t-category').value,
      date: form.querySelector('#t-date').value,
      description: form.querySelector('#t-desc').value.trim(),
      notes: form.querySelector('#t-notes').value.trim(),
      attachment,
    };
    try {
      await api('transactions/create', payload);
      toast('Transaction saved.', 'success');
      m.close();
      await refreshData();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

function badgeClass(type) {
  const map = { Income: 'badge-income', Expense: 'badge-expense', Transfer: 'badge-transfer', Deposit: 'badge-deposit', Withdrawal: 'badge-withdrawal', Fee: 'badge-fee', 'Loan Payment': 'badge-loan', 'Receivable Payment': 'badge-loan' };
  return map[type] || 'badge-neutral';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
