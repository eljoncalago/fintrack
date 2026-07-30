/* ============================================================
   utils.js — Formatting, dates, DOM helpers, money
   ============================================================ */

import { CONFIG } from './config.js';

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function formatMoney(amount, currency = 'THB') {
  const n = Number(amount) || 0;
  const sym = currencySymbol(currency);
  const sign = n < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function currencySymbol(currency) {
  const map = { THB: '฿', PHP: '₱', USD: '$' };
  return map[currency] || (currency ? currency + ' ' : '');
}

export function countryMeta(code) { return CONFIG.COUNTRIES[code] || { code, name: code, currency: '', symbol: '', flag: '🏳️' }; }

export function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function uid() { return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

export function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function sum(arr, key) { return arr.reduce((s, x) => s + (Number(x[key]) || 0), 0); }

/** Escape user text for safe HTML insertion. */
export function esc(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function logoFor(name) {
  return CONFIG.LOGO[name] || '🏦';
}

/** Compute interest for a loan based on its interest type. */
export function computeInterest(principal, interestType, rate, term) {
  const p = Number(principal) || 0;
  const r = Number(rate) || 0;
  const t = Number(term) || 0;
  switch (interestType) {
    case 'No Interest': return 0;
    case 'Annual Interest': return (p * r * t) / 100;
    case 'Monthly Interest': return (p * r * t) / 100;
    case 'Fixed Interest': return 0; // handled via total amount field
    case 'Manual Schedule': return 0;
    default: return 0;
  }
}
