/* ============================================================
   config.js — App configuration
   ============================================================ */

export const CONFIG = {
  // Replace with your Google Apps Script Web App URL (ends with /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbxuf_0k5pvBY8hOr8mG5okYGJSR6r1TFinfDN6f5d1o05VvG-zOss2zM50bCX3M2CpeXA/exec',
  COUNTRIES: {
    TH: { code: 'TH', name: 'Thailand', currency: 'THB', symbol: '฿', flag: '🇹🇭' },
    PH: { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', flag: '🇵🇭' },
  },
  ACCOUNT_TYPES: ['Bank Account', 'E-Wallet', 'Credit Card', 'Cash', 'Savings', 'Investment'],
  LOAN_TYPES: ['Bank Loan', 'Personal Loan', 'Teacher Loan', 'Friend Loan', 'Family Loan', 'Company Loan'],
  INTEREST_TYPES: ['No Interest', 'Annual Interest', 'Monthly Interest', 'Fixed Interest', 'Manual Schedule'],
  PAYMENT_FREQUENCIES: ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
  LOAN_DIRECTIONS: ['Money I Owe', 'Money Owed To Me'],
  INSTITUTIONS: {
    TH: {
      banks: ['Bangkok Bank', 'Kasikornbank', 'Siam Commercial Bank', 'Krungthai Bank', 'Krungsri', 'TTB', 'Government Savings Bank', 'CIMB Thai', 'UOB Thailand', 'Other Bank'],
      wallets: ['TrueMoney', 'ShopeePay', 'Rabbit LINE Pay', 'PayPal'],
    },
    PH: {
      banks: ['BDO', 'BPI', 'Metrobank', 'LandBank', 'UnionBank', 'Security Bank', 'PNB', 'RCBC', 'China Bank', 'Other Bank'],
      wallets: ['GCash', 'Maya', 'ShopeePay', 'PayPal'],
    },
  },
  CATEGORIES: ['Food', 'Transportation', 'Bills', 'Shopping', 'Education', 'Salary', 'Loan', 'Receivable', 'Transfer', 'Fee', 'Other'],
  TRANSACTION_TYPES: ['Income', 'Expense', 'Transfer', 'Deposit', 'Withdrawal', 'Fee', 'Loan Payment', 'Receivable Payment'],
  LOGO: { 'Bangkok Bank': '🟦', 'Kasikornbank': '🟩', 'Siam Commercial Bank': '🟪', 'Krungthai Bank': '🟦', 'Krungsri': '🟨', 'TTB': '🟦', 'Government Savings Bank': '🟫', 'CIMB Thai': '🟥', 'UOB Thailand': '🟦', 'TrueMoney': '🟧', 'ShopeePay': '🟧', 'Rabbit LINE Pay': '🟢', 'PayPal': '🟦', 'BDO': '🟦', 'BPI': '🟦', 'Metrobank': '🟦', 'LandBank': '🟦', 'UnionBank': '🟦', 'Security Bank': '🟦', 'PNB': '🟦', 'RCBC': '🟦', 'China Bank': '🟦', 'GCash': '🟦', 'Maya': '🟦', 'Cash': '💵', 'Savings': '💰', 'Investment': '📈', 'Credit Card': '💳', 'Other Bank': '🏦' },
};
