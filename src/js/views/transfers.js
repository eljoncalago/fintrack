/* ============================================================
   transfers.js — Same currency & cross-currency transfers
   ============================================================ */

import { state, accountsByCountry } from '../state.js';
import { CONFIG } from '../config.js';
import { el, formatMoney, countryMeta, esc, todayISO } from '../utils.js';
import { modal, toast, withLoading } from '../components/ui.js';
import { api } from '../api/api.js';
import { refreshData } from '../app.js';

export function renderTransfersView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Transfers</div><div class="section-sub">Move money between accounts — same or cross currency</div></div>`;
  const newBtn = el('button', { class: 'btn btn-primary' }, '+ New Transfer');
  newBtn.addEventListener('click', () => openTransferForm());
  head.append(newBtn);
  content.append(head);

  // Recent transfers
  const list = state.transfers.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!list.length) {
    const card = el('div', { class: 'card card-pad empty' });
    card.innerHTML = `<div class="empty-ico">⇄</div><div class="empty-title">No transfers yet</div><div class="empty-sub">Move money between your accounts.</div>`;
    content.append(card);
    return;
  }
  const wrap = el('div', { class: 'table-wrap' });
  wrap.innerHTML = `<table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Rate</th><th class="tnum">Sent</th><th class="tnum">Received</th><th class="tnum">Fee</th></tr></thead><tbody></tbody></table>`;
  const tb = wrap.querySelector('tbody');
  list.forEach((t) => {
    const from = state.accounts.find((a) => a.id === t.fromAccountId);
    const to = state.accounts.find((a) => a.id === t.toAccountId);
    const tr = el('tr');
    tr.innerHTML = `<td></td><td></td><td></td><td class="tnum"></td><td class="tnum neg"></td><td class="tnum pos"></td><td class="tnum"></td>`;
    tr.children[0].textContent = t.date;
    tr.children[1].textContent = from ? `${from.institution || from.type} (${from.currency})` : '—';
    tr.children[2].textContent = to ? `${to.institution || to.type} (${to.currency})` : '—';
    tr.children[3].textContent = t.exchangeRate && t.exchangeRate !== 1 ? `1 ${t.currencyFrom} = ${t.exchangeRate} ${t.currencyTo}` : '—';
    tr.children[4].textContent = formatMoney(t.amountFrom, t.currencyFrom);
    tr.children[5].textContent = formatMoney(t.amountTo, t.currencyTo);
    tr.children[6].textContent = formatMoney(t.fee || 0, t.currencyFrom);
    tb.append(tr);
  });
  content.append(wrap);
}

export function openTransferForm() {
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field">
      <label>From Account</label>
      <select id="tr-from"></select>
    </div>
    <div class="form-field">
      <label>To Account</label>
      <select id="tr-to"></select>
    </div>
    <div class="form-field full" id="tr-frominfo" style="display:none"></div>
    <div class="form-field">
      <label>Amount</label>
      <input id="tr-amount" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Date</label>
      <input id="tr-date" type="date" value="${todayISO()}" />
    </div>
    <div class="form-field" id="tr-rate-wrap" style="display:none">
      <label>Exchange Rate (1 from = ? to)</label>
      <input id="tr-rate" type="number" step="0.0001" value="1" />
    </div>
    <div class="form-field" id="tr-fee-wrap">
      <label>Service Charge</label>
      <input id="tr-fee" type="number" step="0.01" min="0" value="0" />
    </div>
    <div class="form-field full">
      <label>Notes</label>
      <textarea id="tr-notes" rows="2"></textarea>
    </div>
    <div class="form-field full" id="tr-summary"></div>
  `;

  const fromSel = form.querySelector('#tr-from');
  const toSel = form.querySelector('#tr-to');
  const all = state.accounts;
  fromSel.innerHTML = accountOptions(all);
  toSel.innerHTML = accountOptions(all);

  function accountOptions(arr) {
    return arr.map((a) => `<option value="${a.id}">${esc(a.institution || a.type)} — ${formatMoney(a.balance, a.currency)} (${a.currency})</option>`).join('');
  }

  function updateSummary() {
    const from = all.find((a) => a.id === fromSel.value);
    const to = all.find((a) => a.id === toSel.value);
    const amount = Number(form.querySelector('#tr-amount').value) || 0;
    const fee = Number(form.querySelector('#tr-fee').value) || 0;
    const rateWrap = form.querySelector('#tr-rate-wrap');
    const summary = form.querySelector('#tr-summary');
    if (!from || !to) { summary.innerHTML = ''; return; }
    const cross = from.currency !== to.currency;
    rateWrap.style.display = cross ? '' : 'none';
    const rate = cross ? (Number(form.querySelector('#tr-rate').value) || 1) : 1;
    const received = amount * rate;
    const totalDeducted = amount + fee;
    summary.innerHTML = `
      <div class="card card-pad">
        <div class="kv"><span class="kv-key">From</span><span class="kv-val">${esc(from.institution)} (${from.currency})</span></div>
        <div class="kv"><span class="kv-key">To</span><span class="kv-val">${esc(to.institution)} (${to.currency})</span></div>
        ${cross ? `<div class="kv"><span class="kv-key">Exchange rate</span><span class="kv-val">1 ${from.currency} = ${rate} ${to.currency}</span></div>` : ''}
        <div class="kv"><span class="kv-key">Principal</span><span class="kv-val">${formatMoney(amount, from.currency)}</span></div>
        <div class="kv"><span class="kv-key">Service charge</span><span class="kv-val">${formatMoney(fee, from.currency)}</span></div>
        <div class="kv"><span class="kv-key">Total deducted</span><span class="kv-val neg">${formatMoney(totalDeducted, from.currency)}</span></div>
        <div class="kv"><span class="kv-key">Recipient receives</span><span class="kv-val pos">${formatMoney(received, to.currency)}</span></div>
      </div>`;
  }
  [fromSel, toSel, form.querySelector('#tr-amount'), form.querySelector('#tr-fee'), form.querySelector('#tr-rate')].forEach((s) => s.addEventListener('input', updateSummary));
  updateSummary();

  const saveBtn = el('button', { class: 'btn btn-primary' }, 'Transfer');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: 'New Transfer', body: form, footer: [cancelBtn, saveBtn], size: 'lg' });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const from = all.find((a) => a.id === fromSel.value);
    const to = all.find((a) => a.id === toSel.value);
    if (!from || !to) { toast('Select both accounts.', 'error'); return; }
    const amount = Number(form.querySelector('#tr-amount').value) || 0;
    if (amount <= 0) { toast('Enter a valid amount.', 'error'); return; }
    const cross = from.currency !== to.currency;
    const rate = cross ? (Number(form.querySelector('#tr-rate').value) || 1) : 1;
    const fee = Number(form.querySelector('#tr-fee').value) || 0;
    try {
      await api('transfers/create', {
        fromAccountId: from.id, toAccountId: to.id,
        amountFrom: amount, fee,
        exchangeRate: rate,
        date: form.querySelector('#tr-date').value,
        notes: form.querySelector('#tr-notes').value.trim(),
      });
      toast('Transfer completed.', 'success');
      m.close();
      await refreshData();
      renderTransfersView();
    } catch (e) { toast(e.message, 'error'); }
  }));
}
