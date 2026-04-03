/* ============================================================
   MOCK DATA — Enterprise ERP
   Shared across all pages during development.
   Will be replaced by real API calls in later phases.
   ============================================================ */

export interface Client {
  id: number;
  name: string;
  type: 'Buyer' | 'Seller' | 'Both';
  contact: string;
  status: 'Active' | 'Inactive';
}

export interface Transaction {
  id: string;
  date: string;
  product: string;
  buyer: string;
  seller: string;
  qty: number;
  price: number;
  total: number;
  bComm: number;
  sComm: number;
}

export interface LedgerEntry {
  client: string;
  type: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
}

export interface Invoice {
  id: string;
  client: string;
  date: string;
  tenure: string;
  amount: number;
  type: string;
  status: 'Pending' | 'Paid' | 'Draft' | 'Cancelled';
}

export interface Bank {
  id: number;
  name: string;
  address: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  code: string;
}

export interface TransactionDetail {
  id: number;
  type: string;
  no: string;
  date: string;
  particulars: string;
  drAmt: string;
  crAmt: string;
}

export interface Receipt {
  id: string;
  client: string;
  bank: string;
  amount: number;
  date: string;
  status: 'Cleared' | 'Pending' | 'Bounced';
}

export const mockClients: Client[] = [
  { id: 1, name: 'AANCHAL INTERNATIONAL LIMITED', type: 'Buyer', contact: 'accounts@aanchal.com', status: 'Active' },
  { id: 2, name: 'Global Supplies', type: 'Seller', contact: 'sales@global.com', status: 'Active' },
  { id: 3, name: 'TechSolutions', type: 'Both', contact: 'billing@techsol.com', status: 'Inactive' },
];

export const mockTransactions: Transaction[] = [
  { id: 'TRX-001', date: '2026-03-30', product: 'Industrial Widgets', buyer: 'AANCHAL INTERNATIONAL LIMITED', seller: 'Global Supplies', qty: 500, price: 10, total: 5000, bComm: 100, sComm: 150 },
  { id: 'TRX-002', date: '2026-03-31', product: 'Copper Wire Spools', buyer: 'TechSolutions', seller: 'Global Supplies', qty: 200, price: 45, total: 9000, bComm: 180, sComm: 270 },
];

export const mockLedger: LedgerEntry[] = [
  { client: 'AANCHAL INTERNATIONAL LIMITED', type: 'Buyer', totalInvoiced: 15000, totalPaid: 10000, outstanding: 5000 },
  { client: 'Global Supplies', type: 'Seller', totalInvoiced: 22000, totalPaid: 22000, outstanding: 0 },
];

export const mockInvoices: Invoice[] = [
  { id: '03/ARM/2025-26', client: 'AANCHAL INTERNATIONAL LIMITED', date: '2026-03-31', tenure: 'APR-JUN', amount: 500, type: 'Commission (Buyer)', status: 'Pending' },
  { id: 'INV-2026-02', client: 'Global Supplies', date: '2026-03-01', tenure: 'Q1 2026', amount: 1250, type: 'Commission (Seller)', status: 'Paid' },
];

export const mockBanks: Bank[] = [
  { id: 1, name: 'Bandhan Bank', address: '12 AC Street', accountNo: '000654321910', ifsc: 'BAND000563', branch: 'KOLKATA', code: '2100' },
  { id: 2, name: 'Icici Bank', address: '12 JK Street', accountNo: '000654321541', ifsc: 'ICIC000560', branch: 'KOLKATA', code: '7100' },
];

export const mockTransactionDetails: TransactionDetail[] = [
  { id: 1, type: 'Receipt', no: 'RC-024', date: '01-04-2026', particulars: 'Payment from TechSolutions', drAmt: '1500.00', crAmt: '' },
  { id: 2, type: 'Journal', no: 'JV-102', date: '01-04-2026', particulars: 'Commission Adjustment', drAmt: '', crAmt: '1500.00' },
];

export const mockReceipts: Receipt[] = [
  { id: 'RCT-001', client: 'TechSolutions', bank: 'Bandhan Bank', amount: 1500, date: '01-04-2026', status: 'Cleared' },
];

/* ============================================================
   CURRENCY FORMATTER — INR (₹)
   ============================================================ */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
