/* ============================================================
   loading.js — Startup loading screen controller
   ============================================================ */

import { $ } from './utils.js';

const STEPS = [
  'Connecting to server…',
  'Loading settings…',
  'Loading accounts…',
  'Loading transactions…',
  'Loading transfers…',
  'Loading loans…',
  'Loading loan payments…',
  'Loading receivables…',
  'Loading contacts…',
  'Loading notifications…',
  'Rendering dashboard…',
];

let i = 0;
export function nextLoadingStep() {
  const bar = $('#loading-bar-fill');
  const status = $('#loading-status');
  if (i >= STEPS.length) return;
  status.textContent = STEPS[i];
  bar.style.width = `${Math.round(((i + 1) / STEPS.length) * 100)}%`;
  i += 1;
}

export function setLoadingStep(idx) {
  i = idx;
  nextLoadingStep();
}

export function hideLoading() {
  const ls = $('#loading-screen');
  if (!ls) return;
  ls.style.opacity = '0';
  ls.style.transition = 'opacity 0.3s';
  setTimeout(() => ls.remove(), 320);
}
