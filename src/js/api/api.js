/* ============================================================
   api.js — REST client for Google Apps Script backend
   Uses fetch with no-cors fallback handling and JSON POST.
   ============================================================ */

import { CONFIG } from './config.js';

const TOKEN_KEY = 'fintrack_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Call the Apps Script API.
 * Apps Script web apps accept POST with JSON body.
 * @param {string} path  e.g. 'bootstrap', 'accounts/list'
 * @param {object} [body]  payload sent as JSON
 * @param {object} [opts]  { method }
 */
export async function api(path, body = {}, opts = {}) {
  const url = CONFIG.API_URL;
  if (!url || url.startsWith('PASTE_')) {
    throw new Error('API URL not configured. Open src/js/config.js and paste your Apps Script Web App URL.');
  }
  const method = (opts.method || 'POST').toUpperCase();
  const payload = { ...body, _path: path, _token: getToken() };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Invalid JSON response from server:\n' + text.slice(0, 300)); }
  if (json && json.success === false) {
    const err = new Error(json.message || 'Request failed');
    err.data = json;
    throw err;
  }
  return json;
}

/* Convenience wrappers */
export const apiGet = (path, body = {}) => api(path, body, { method: 'POST' });
export const apiPost = (path, body = {}) => api(path, body, { method: 'POST' });
