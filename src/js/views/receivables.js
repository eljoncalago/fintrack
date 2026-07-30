/* ============================================================
   receivables.js — Money owed to you, with collection payments
   ============================================================ */

import { state, receivablesByCountry, receivableById } from '../state.js';
import { el, formatMoney, countryMeta, fmtDate, todayISO, esc, sum } from '../utils.js';
import { modal, toast, confirmDialog, withLoading } from '../components/ui.js';
import { api } from '../api/api.js';
import { refreshData } from '../app.js';
import { emptyState } from './dashboard.js';

export function renderReceivablesView() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<div><div class="section-title">Receivables</div><div class="section-sub">Money other people owe you</div></div>`;
  const addBtn = el('button', { class: 'btn btn-primary' }, '+ Add Receivable');
  addBtn.addEventListener('click', () => openReceivableForm());
  head.append(addBtn);
  content.append(head);

  const filters = el('div', { class: 'filters' });
  const countrySel = el('select');
  countrySel.innerHTML = `<option value="ALL">All Countries</option><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option>`;
  countrySel.value = state.currentCountry === 'ALL' ? 'ALL' : state.currentCountry;
  filters.append(countrySel);
  content.append(filters);

  const host = el('div', { id: 'rec-host' });
  content.append(host);

  function rerender() {
    const list = receivablesByCountry(countrySel.value);
    host.innerHTML = '';
    if (!list.length) { host.append(emptyState('No receivables', 'Track money lent to others.', 'Add Receivable', () => openReceivableForm())); return; }
    const grid = el('div', { class: 'grid grid-auto' });
    list.forEach((r) => grid.append(receivableCard(r)));
    host.append(grid);
  }
  countrySel.addEventListener('change', rerender);
  rerender();
}

function receivableCard(r) {
  const meta = countryMeta(r.country);
  const card = el('div', { class: 'acct-card' });
  card.innerHTML = `
    <div class="acct-head">
      <div class="acct-logo">📝</div>
      <div>
        <div class="acct-name"></div>
        <div class="acct-type">Receivable</div>
      </div>
    </div>
    <div class="acct-meta"><span class="flag">${meta.flag}</span> · Due ${fmtDate(r.dueDate) || '—'}</div>
    <div class="acct-balance"></div>
    <div class="acct-num">Paid: ${formatMoney(r.paid, r.currency)} / ${formatMoney(r.amount, r.currency)}</div>
    <div class="acct-actions">
      <button class="btn btn-ghost btn-sm" data-act="collect">Collect</button>
      <button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>
      <button class="btn btn-danger btn-sm" data-act="del">Delete</button>
    </div>
  `;
  card.querySelector('.acct-name').textContent = r.person || 'Unknown';
  card.querySelector('.acct-balance').textContent = formatMoney(r.remaining, r.currency);
  card.querySelector('[data-act="collect"]').addEventListener('click', (e) => { e.stopPropagation(); openCollection(r.id); });
  card.querySelector('[data-act="edit"]').addEventListener('click', (e) => { e.stopPropagation(); openReceivableForm(r); });
  card.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmDialog({ title: 'Delete receivable?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try { await api('receivables/delete', { id: r.id }); toast('Deleted.', 'success'); await refreshData(); renderReceivablesView(); }
    catch (er) { toast(er.message, 'error'); }
  });
  return card;
}

export function openReceivableForm(existing) {
  const r = existing || {};
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field">
      <label>Country</label>
      <select id="r-country"><option value="TH">🇹🇭 Thailand</option><option value="PH">🇵🇭 Philippines</option></select>
    </div>
    <div class="form-field">
      <label>Person / Borrower</label>
      <input id="r-person" type="text" placeholder="Who owes you?" />
    </div>
    <div class="form-field">
      <label>Total Amount</label>
      <input id="r-amount" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Already Paid</label>
      <input id="r-paid" type="number" step="0.01" min="0" value="0" />
    </div>
    <div class="form-field">
      <label>Due Date</label>
      <input id="r-due" type="date" />
    </div>
    <div class="form-field">
      <label>Status</label>
      <select id="r-status"><option>Active</option><option>Paid</option><option>Overdue</option></select>
    </div>
    <div class="form-field full">
      <label>Notes</label>
      <textarea id="r-notes" rows="2"></textarea>
    </div>
  `;
  if (existing) {
    form.querySelector('#r-country').value = existing.country || 'TH';
    form.querySelector('#r-person').value = existing.person || '';
    form.querySelector('#r-amount').value = existing.amount || 0;
    form.querySelector('#r-paid').value = existing.paid || 0;
    form.querySelector('#r-due').value = existing.dueDate || '';
    form.querySelector('#r-status').value = existing.status || 'Active';
    form.querySelector('#r-notes').value = existing.notes || '';
  } else {
    form.querySelector('#r-due').value = todayISO();
  }
  const saveBtn = el('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create Receivable');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: existing ? 'Edit Receivable' : 'Add Receivable', body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const payload = {
      id: existing?.id,
      country: form.querySelector('#r-country').value,
      person: form.querySelector('#r-person').value.trim(),
      amount: Number(form.querySelector('#r-amount').value) || 0,
      paid: Number(form.querySelector('#r-paid').value) || 0,
      dueDate: form.querySelector('#r-due').value,
      status: form.querySelector('#r-status').value,
      notes: form.querySelector('#r-notes').value.trim(),
    };
    payload.remaining = payload.amount - payload.paid;
    try {
      await api(existing ? 'receivables/update' : 'receivables/create', payload);
      toast('Receivable saved.', 'success');
      m.close();
      await refreshData();
      renderReceivablesView();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

export function openCollection(id) {
  const r = receivableById(id);
  if (!r) return;
  const form = el('div', { class: 'form-grid' });
  form.innerHTML = `
    <div class="form-field full">
      <label>Receivable</label>
      <input type="text" disabled value="${esc(r.person)} — Remaining ${formatMoney(r.remaining, r.currency)}" />
    </div>
    <div class="form-field">
      <label>Amount Received (${r.currency})</label>
      <input id="c-amount" type="number" step="0.01" min="0" />
    </div>
    <div class="form-field">
      <label>Date</label>
      <input id="c-date" type="date" value="${todayISO()}" />
    </div>
    <div class="form-field">
      <label>Deposit To Account (optional)</label>
      <select id="c-acct"><option value="">None</option></select>
    </div>
    <div class="form-field full">
      <label>Receipt (optional)</label>
      <input id="c-file" type="file" accept="image/*,application/pdf" />
    </div>
  `;
  const acctSel = form.querySelector('#c-acct');
  state.accounts.filter((a) => a.currency === r.currency).forEach((a) => acctSel.insertAdjacentHTML('beforeend', `<option value="${a.id}">${esc(a.institution || a.type)}</option>`));

  const saveBtn = el('button', { class: 'btn btn-primary' }, 'Record Collection');
  const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
  const m = modal({ title: 'Collect Payment', body: form, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener('click', m.close);
  saveBtn.addEventListener('click', withLoading(saveBtn, async () => {
    const file = form.querySelector('#c-file').files[0];
    let attachment = null;
    if (file) {
      const b64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result.split(',')[1]); rd.onerror = rej; rd.readAsDataURL(file); });
      attachment = { name: file.name, mime: file.type, data: b64 };
    }
    try {
      await api('receivables/collect', {
        id: r.id,
        amount: Number(form.querySelector('#c-amount').value) || 0,
        date: form.querySelector('#c-date').value,
        accountId: form.querySelector('#c-acct').value || null,
        attachment,
      });
      toast('Collection recorded.', 'success');
      m.close();
      await refreshData();
      renderReceivablesView();
    } catch (e) { toast(e.message, 'error'); }
  }));
}
