/* ============================================================
   state.js — App state (transient; always re-fetched from API)
   Financial data is NEVER persisted here across reloads.
   ============================================================ */

export const state = {
  bootstrapped: false,
  settings: {},
  accounts: [],
  transactions: [],
  transfers: [],
  loans: [],
  loanPayments: [],
  receivables: [],
  contacts: [],
  notifications: [],
  exchangeRates: [],
  attachments: [],
  auditLogs: [],
  currentCountry: 'TH', // 'TH' | 'PH' | 'ALL'
  currentView: 'dashboard',
};

export function setState(key, value) {
  state[key] = value;
}

/** Replace all bootstrap data at once. */
export function applyBootstrap(data = {}) {
  state.settings = data.settings || {};
  state.accounts = data.accounts || [];
  state.transactions = data.transactions || [];
  state.transfers = data.transfers || [];
  state.loans = data.loans || [];
  state.loanPayments = data.loanPayments || [];
  state.receivables = data.receivables || [];
  state.contacts = data.contacts || [];
  state.notifications = data.notifications || [];
  state.exchangeRates = data.exchangeRates || [];
  state.attachments = data.attachments || [];
  state.auditLogs = data.auditLogs || [];
  state.bootstrapped = true;
}

/* ---------- Selectors ---------- */

export function accountsByCountry(country) {
  if (country === 'ALL') return state.accounts;
  return state.accounts.filter((a) => a.country === country);
}

export function transactionsByCountry(country) {
  if (country === 'ALL') return state.transactions;
  return state.transactions.filter((t) => t.country === country);
}

export function loansByCountry(country) {
  if (country === 'ALL') return state.loans;
  return state.loans.filter((l) => l.country === country);
}

export function receivablesByCountry(country) {
  if (country === 'ALL') return state.receivables;
  return state.receivables.filter((r) => r.country === country);
}

export function accountById(id) {
  return state.accounts.find((a) => a.id === id);
}

export function transactionsByAccount(accountId) {
  return state.transactions.filter((t) => t.accountId === accountId);
}

export function loanById(id) {
  return state.loans.find((l) => l.id === id);
}

export function loanPaymentsByLoan(loanId) {
  return state.loanPayments.filter((p) => p.loanId === loanId);
}

export function receivableById(id) {
  return state.receivables.find((r) => r.id === id);
}
