/* ============================================================
   loans.js — Loan management (money I owe / owed to me) + payments
   ============================================================ */

import { state, loansByCountry, loanById, loanPaymentsByLoan } from '../state.js';
import { CONFIG } from '../config.js';
import { el, formatMoney, countryMeta, fmtDate, todayISO, esc, sum, computeInterest } from '../utils.js';
import { modal, toast, confirmDialog, withLoading } from '../components/ui.js';
import { api } from '../api/api.js';
import { refreshData } from '../app.js';
import { emptyState } from './dashboard.js';

export function renderLoansView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Loans</div><div class="section-sub">Money you owe and money owed to you</div></div>`;
  const addBtn = el('button', { class: 'btn btn-primary' }, '+ Add Loan');
  addBtn.addEventListener('click', () => openLoanForm());
  head.append(addBtn);
  content.append(head);

  const filters = el('div', { class: 'filters' });
  const countrySel = el('select');
  countrySel.innerHTML = `<option value="ALL">All Countries</option><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option>`;
  countrySel.value = state.currentCountry === 'ALL' ? 'ALL' : state.currentCountry;
  const dirSel = el('select');
  dirSel.innerHTML = `<option value="">All Directions</option>` + CONFIG.LOAN_DIRECTIONS.map((d) => `<option value="${d}">${d}</option>`).join('');
  filters.append(countrySel, dirSel);
  content.append(filters);

  const host = el('div', { id: 'loan-host' });
  content.append(host);

  function rerender() {
    const country = countrySel.value;
    const dir = dirSel.value;
    let list = loansByCountry(country);
    if (dir) list = list.filter((l) => l.direction === dir);
    host.innerHTML = '';
    if (!list.length) { host.append(emptyState('No loans', 'Add a loan to track payments and interest.', 'Add Loan', () => openLoanForm())); return; }
    const grid = el('div', { class: 'grid grid-auto' });
    list.forEach((l) => grid.append(loanCard(l)));
    host.append(grid);
  }
  countrySel.addEventListener('change', rerender);
  dirSel.addEventListener('change', rerender);
  rerender();
}

function loanCard(l) {
  const meta = countryMeta(l.country);
  const card = el('div', { class: 'acct-card' });
  const interestAmt = computeInterest(l.principal, l.interestType, l.interestRate, l.term);
  card.innerHTML = `
    <div class="acct-head">
      <div class="acct-logo">${l.direction === 'Money I Owe' ? '💸' : '🤝'}</div>
      <div>
        <div class="acct-name"></div>
        <div class="acct-type"></div>
      </div>
    </div>
    <div class="acct-meta"><span class="flag">${meta.flag}</span> · ${l.providerType || ''}</div>
    <div class="acct-balance"></div>
    <div class="acct-num">Principal: ${formatMoney(l.principal, l.currency)}</div>
    <div class="acct-actions">
      <button class="btn btn-ghost btn-sm" data-act="pay">Pay</button>
      <button class="btn btn-ghost btn-sm" data-act="detail">Details</button>
      <button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>
      <button class="btn btn-danger btn-sm" data-act="del">Delete</button>
    </div>
  `;
  card.querySelector('.acct-name').textContent = l.providerName || l.providerType || 'Loan';
  card.querySelector('.acct-type').textContent = l.direction;
  card.querySelector('.acct-balance').textContent = formatMoney(l.balance, l.currency);
  card.addEventListener('click', (e) => { if (!e.target.closest('[data-act]')) openLoanDetail(l.id); });
  card.querySelector('[data-act="pay"]').addEventListener('click', (e) => { e.stopPropagation(); openLoanPayment(l.id); });
  card.querySelector('[data-act="detail"]').addEventListener('click', (e) => { e.stopPropagation(); openLoanDetail(l.id); });
  card.querySelector('[data-act="edit"]').addEventListener('click', (e) => { e.stopPropagation(); openLoanForm(l); });
  card.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmDialog({ title: 'Delete loan?', message: 'This will remove the loan and its payments.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try { await api('loans/delete', { id: l.id }); toast('Loan deleted.', 'success'); await refreshData(); renderLoansView(); }
    catch (er) { toast(er.message, 'error'); }
  });
  return card;
}

/* ---------- Loan form ---------- */
export function openLoanForm(existing) {
  const l = existing || {};
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field">
      <label>Country</label>
      <select id="l-country"><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option></select>
    </div>
    <div class="form-field">
      <label>Direction</label>
      <select id="l-dir">${CONFIG.LOAN_DIRECTIONS.map((d) => `<option>${d}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Provider Type</label>
      <select id="l-ptype">${CONFIG.LOAN_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Provider Name</label>
      <input id="l-pname" type="text" placeholder="e.g. Bangkok Bank, Maria" />
    </div>
    <div class="form-field">
      <label>Loan Amount</label>
      <input id="l-principal" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Interest Type</label>
      <select id="l-itype">${CONFIG.INTEREST_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Interest Rate (%)</label>
      <input id="l-rate" type="number" step="0.01" value="0" />
    </div>
    <div class="form-field">
      <label>Term (months)</label>
      <input id="l-term" type="number" min="0" value="0" />
    </div>
    <div class="form-field">
      <label>Payment Frequency</label>
      <select id="l-freq">${CONFIG.PAYMENT_FREQUENCIES.map((f) => `<option>${f}</option>`).join('')}</select>
    </div>
    <div class="form-field">
      <label>Start Date</label>
      <input id="l-start" type="date" />
    </div>
    <div class="form-field">
      <label>Due Date</label>
      <input id="l-due" type="date" />
    </div>
    <div class="form-field">
      <label>Linked Account (optional)</label>
      <select id="l-acct"><option value="">None</option></select>
    </div>
    <div class="form-field full">
      <label>Notes</label>
      <textarea id="l-notes" rows="2"></textarea>
    </div>
  `;
  // populate accounts
  const acctSel = form.querySelector('#l-acct');
  state.accounts.forEach((a) => acctSel.insertAdjacentHTML('beforeend', `<option value="${a.id}">${esc(a.institution || a.type)} (${a.currency})</option>`));

  if (existing) {
    form.querySelector('#l-country').value = existing.country || 'TH';
    form.querySelector('#l-dir').value = existing.direction || 'Money I Owe';
    form.querySelector('#l-ptype').value = existing.providerType || 'Personal Loan';
    form.querySelector('#l-pname').value = existing.providerName || '';
    form.querySelector('#l-principal').value = existing.principal || 0;
    form.querySelector('#l-itype').value = existing.interestType || 'No Interest';
    form.querySelector('#l-rate').value = existing.interestRate || 0;
    form.querySelector('#l-term').value = existing.term || 0;
    form.querySelector('#l-freq').value = existing.paymentFrequency || 'Monthly';
    form.querySelector('#l-start').value = existing.startDate || todayISO();
    form.querySelector('#l-due').value = existing.dueDate || '';
    form.querySelector('#l-acct').value = existing.accountId || '';
    form.querySelector('#l-notes').value = existing.notes || '';
  } else {
    form.querySelector('#l-start').value = todayISO();
  }

  const saveBtn = el('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create Loan');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: existing ? 'Edit Loan' : 'Add Loan', body: form, footer: [cancelBtn, saveBtn], size: 'lg' });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const payload = {
      id: existing?.id,
      country: form.querySelector('#l-country').value,
      direction: form.querySelector('#l-dir').value,
      providerType: form.querySelector('#l-ptype').value,
      providerName: form.querySelector('#l-pname').value.trim(),
      principal: Number(form.querySelector('#l-principal').value) || 0,
      interestType: form.querySelector('#l-itype').value,
      interestRate: Number(form.querySelector('#l-rate').value) || 0,
      term: Number(form.querySelector('#l-term').value) || 0,
      paymentFrequency: form.querySelector('#l-freq').value,
      startDate: form.querySelector('#l-start').value,
      dueDate: form.querySelector('#l-due').value,
      accountId: form.querySelector('#l-acct').value || null,
      notes: form.querySelector('#l-notes').value.trim(),
    };
    try {
      await api(existing ? 'loans/update' : 'loans/create', payload);
      toast('Loan saved.', 'success');
      m.close();
      await refreshData();
      renderLoansView();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Loan detail ---------- */
export function openLoanDetail(id) {
  const l = loanById(id);
  if (!l) return;
  const meta = countryMeta(l.country);
  const payments = loanPaymentsByLoan(id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const paid = sum(payments, 'actualAmount');
  const interest = computeInterest(l.principal, l.interestType, l.interestRate, l.term);

  const body = el('div');
  body.innerHTML = `
    <div class="card card-pad mb-4">
      <div class="flex items-center gap-4">
        <div class="acct-logo" style="width:56px;height:56px;font-size:28px">${l.direction === 'Money I Owe' ? '💸' : '🤝'}</div>
        <div>
          <div class="text-lg text-bold"></div>
          <div class="text-soft text-sm"></div>
        </div>
        <div class="spacer"></div>
        <div class="text-right">
          <div class="text-soft text-sm">Remaining Balance</div>
          <div class="text-bold" style="font-size:26px;font-family:var(--font-display)"></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid grid-3">
        <div><div class="text-soft text-sm">Principal</div><div class="text-bold"></div></div>
        <div><div class="text-soft text-sm">Interest (calc.)</div><div class="text-bold"></div></div>
        <div><div class="text-soft text-sm">Total Paid</div><div class="text-bold pos"></div></div>
      </div>
      <div class="divider"></div>
      <div class="grid grid-3">
        <div><div class="text-soft text-sm">Interest Type</div><div class="text-bold"></div></div>
        <div><div class="text-soft text-sm">Rate</div><div class="text-bold"></div></div>
        <div><div class="text-soft text-sm">Due Date</div><div class="text-bold"></div></div>
      </div>
      <div class="divider"></div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" data-act="pay">Record Payment</button>
        <button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>
      </div>
    </div>
    <div class="card card-pad">
      <div class="card-title">Payment History</div>
      <div id="loan-payments"></div>
    </div>
  `;
  body.querySelector('.text-lg').textContent = l.providerName || l.providerType;
  body.querySelector('.text-soft').textContent = `${l.direction} · ${meta.flag} ${meta.name} · ${l.currency}`;
  body.querySelector('.text-bold:last-child').textContent = formatMoney(l.balance, l.currency);
  body.querySelectorAll('.grid > div > div:nth-child(2)')[0].textContent = formatMoney(l.principal, l.currency);
  body.querySelectorAll('.grid > div > div:nth-child(2)')[1].textContent = formatMoney(interest, l.currency);
  body.querySelectorAll('.grid > div > div:nth-child(2)')[2].textContent = formatMoney(paid, l.currency);
  body.querySelectorAll('.grid > div > div:nth-child(2)')[3].textContent = l.interestType;
  body.querySelectorAll('.grid > div > div:nth-child(2)')[4].textContent = l.interestRate ? `${l.interestRate}%` : '—';
  body.querySelectorAll('.grid > div > div:nth-child(2)')[5].textContent = fmtDate(l.dueDate) || '—';

  const ph = body.querySelector('#loan-payments');
  if (!payments.length) {
    ph.append(emptyState('No payments', 'Record a payment to track progress.'));
  } else {
    const wrap = el('div', { class: 'table-wrap' });
    wrap.innerHTML = `<table><thead><tr><th>Date</th><th>Scheduled</th><th>Actual</th><th>Difference</th><th>Notes</th></tr></thead><tbody></tbody></table>`;
    const tb = wrap.querySelector('tbody');
    payments.forEach((p) => {
      const tr = el('tr');
      tr.innerHTML = `<td></td><td class="tnum"></td><td class="tnum pos"></td><td class="tnum"></td><td></td>`;
      tr.children[0].textContent = fmtDate(p.date);
      tr.children[1].textContent = formatMoney(p.scheduledAmount, l.currency);
      tr.children[2].textContent = formatMoney(p.actualAmount, l.currency);
      tr.children[3].textContent = formatMoney((p.scheduledAmount || 0) - (p.actualAmount || 0), l.currency);
      tr.children[4].textContent = p.notes || '';
      tb.append(tr);
    });
    ph.append(wrap);
  }
  body.querySelector('[data-act="pay"]').addEventListener('click', () => openLoanPayment(l.id));
  body.querySelector('[data-act="edit"]').addEventListener('click', () => openLoanForm(l));

  modal({ title: 'Loan Details', body, size: 'lg' });
}

/* ---------- Loan payment ---------- */
export function openLoanPayment(loanId) {
  const l = loanById(loanId);
  if (!l) return;
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field full">
      <label>Loan</label>
      <input type="text" disabled value="${esc(l.providerName || l.providerType)} — ${formatMoney(l.balance, l.currency)}" />
    </div>
    <div class="form-field">
      <label>Scheduled Amount (${l.currency})</label>
      <input id="lp-sched" type="number" step="0.01" min="0" value="0" />
    </div>
    <div class="form-field">
      <label>Actual Amount Paid (${l.currency})</label>
      <input id="lp-actual" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Date</label>
      <input id="lp-date" type="date" value="${todayISO()}" />
    </div>
    <div class="form-field">
      <label>Pay From Account (optional)</label>
      <select id="lp-acct"><option value="">None</option></select>
    </div>
    <div class="form-field full">
      <label>Reason / Notes (for partial or overpayment)</label>
      <textarea id="lp-notes" rows="2"></textarea>
    </div>
    <div class="form-field full">
      <label>Attachment (receipt/agreement)</label>
      <input id="lp-file" type="file" accept="image/*,application/pdf" />
    </div>
  `;
  const acctSel = form.querySelector('#lp-acct');
  state.accounts.filter((a) => a.currency === l.currency).forEach((a) => acctSel.insertAdjacentHTML('beforeend', `<option value="${a.id}">${esc(a.institution || a.type)}</option>`));

  const saveBtn = el('button', { class: 'btn btn-primary' }, 'Record Payment');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: 'Loan Payment', body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const file = form.querySelector('#lp-file').files[0];
    let attachment = null;
    if (file) {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
      attachment = { name: file.name, mime: file.type, data: b64 };
    }
    try {
      await api('loan-payments/create', {
        loanId: l.id,
        scheduledAmount: Number(form.querySelector('#lp-sched').value) || 0,
        actualAmount: Number(form.querySelector('#lp-actual').value) || 0,
        date: form.querySelector('#lp-date').value,
        accountId: form.querySelector('#lp-acct').value || null,
        notes: form.querySelector('#lp-notes').value.trim(),
        attachment,
      });
      toast('Payment recorded.', 'success');
      m.close();
      await refreshData();
    } catch (e) { toast(e.message, 'error'); }
  }));
}
