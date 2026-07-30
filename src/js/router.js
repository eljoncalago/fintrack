/* ============================================================
   router.js — Simple view router
   ============================================================ */

import { state } from './state.js';
import { renderDashboard } from './views/dashboard.js';
import { renderAccountsView } from './views/accounts.js';
import { renderTransactionsView } from './views/transactions.js';
import { renderTransfersView } from './views/transfers.js';
import { renderLoansView } from './views/loans.js';
import { renderReceivablesView } from './views/receivables.js';
import { renderReportsView } from './views/reports.js';
import { renderSettingsView } from './views/settings.js';

const VIEWS = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  accounts: { title: 'Accounts', render: renderAccountsView },
  transactions: { title: 'Transactions', render: renderTransactionsView },
  transfers: { title: 'Transfers', render: renderTransfersView },
  loans: { title: 'Loans', render: renderLoansView },
  receivables: { title: 'Receivables', render: renderReceivablesView },
  reports: { title: 'Reports', render: renderReportsView },
  settings: { title: 'Settings', render: renderSettingsView },
};

export function goTo(view) {
  if (!VIEWS[view]) view = 'dashboard';
  state.currentView = view;
  document.getElementById('topbar-title').textContent = VIEWS[view].title;
  // active nav
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
  VIEWS[view].render();
  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
}

export function currentView() { return state.currentView; }
export { VIEWS };
