/* ============================================================
   ui.js — Reusable UI components: toast, modal, confirm, loading
   ============================================================ */

import { el, $ } from './utils.js';

/* ---------- Toast ---------- */
export function toast(message, type = 'info', duration = 3500) {
  const root = $('#toast-root');
  const t = el('div', { class: `toast ${type}` });
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  t.innerHTML = `<span class="btn-icon">${icon}</span><span class="toast-msg"></span>`;
  t.querySelector('.toast-msg').textContent = message;
  root.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 250); }, duration);
}

/* ---------- Modal ---------- */
export function modal({ title, body, footer, size }) {
  const root = $('#modal-root');
  root.innerHTML = '';
  root.classList.add('open');
  const back = el('div', { class: 'modal-backdrop' });
  const m = el('div', { class: 'modal' + (size === 'lg' ? ' lg' : '') });
  m.innerHTML = `
    <div class="modal-head">
      <div class="modal-title"></div>
      <button class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body"></div>
    ${footer ? '<div class="modal-foot"></div>' : ''}
  `;
  m.querySelector('.modal-title').textContent = title || '';
  const bodyEl = m.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.append(body);
  else if (Array.isArray(body)) bodyEl.append(...body);
  if (footer) {
    const foot = m.querySelector('.modal-foot');
    foot.append(...(Array.isArray(footer) ? footer : [footer]));
  }
  const close = () => { root.classList.remove('open'); root.innerHTML = ''; };
  m.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', close);
  root.append(back, m);
  return { close, body: bodyEl, modal: m };
}

/* ---------- Confirm dialog ---------- */
export function confirmDialog({ title = 'Are you sure?', message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const okBtn = el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}` }, confirmText);
    const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Cancel');
    const body = el('div', { class: 'text-sm' }, message || '');
    const m = modal({ title, body, footer: [cancelBtn, okBtn] });
    okBtn.addEventListener('click', () => { m.close(); resolve(true); });
    cancelBtn.addEventListener('click', () => { m.close(); resolve(false); });
  });
}

/* ---------- Loading overlay for buttons ---------- */
export function withLoading(btn, fn) {
  return async (...args) => {
    if (!btn) return fn(...args);
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon spin">↻</span> Working…';
    try { return await fn(...args); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
  };
}
