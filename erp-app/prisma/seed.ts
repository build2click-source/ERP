import 'dotenv/config';
import { AccountType } from '@prisma/client';
import { prisma } from '../src/lib/db';

/**
 * Seed — Chart of Accounts
 * 
 * Standard Indian double-entry structure:
 * 
 * ASSETS (Dr normal)
 *   ├── Cash & Bank
 *   ├── Accounts Receivable (AR)
 *   ├── Inventory Asset
 *   └── GST Input Credit
 * 
 * LIABILITIES (Cr normal)
 *   ├── Accounts Payable (AP)
 *   └── GST Output Liability
 *       ├── CGST Output
 *       ├── SGST Output
 *       └── IGST Output
 * 
 * EQUITY (Cr normal)
 *   ├── Owner's Equity
 *   └── Retained Earnings
 * 
 * REVENUE (Cr normal) — P&L
 *   ├── Sales Revenue
 *   ├── Commission Income (Buyer)
 *   └── Commission Income (Seller)
 * 
 * EXPENSE (Dr normal) — P&L
 *   ├── Cost of Goods Sold (COGS)
 *   ├── Commission Expense
 *   └── General & Admin Expenses
 */

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  isPandL: boolean;
  parentCode?: string;
}

const accounts: AccountSeed[] = [
  // ── ASSETS ──
  { code: '1000', name: 'Assets', type: 'Asset', isPandL: false },
  { code: '1100', name: 'Cash & Bank', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1110', name: 'Cash in Hand', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1120', name: 'Bandhan Bank', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1130', name: 'ICICI Bank', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1300', name: 'Inventory Asset', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1400', name: 'GST Input Credit', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1410', name: 'CGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },
  { code: '1420', name: 'SGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },
  { code: '1430', name: 'IGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },

  // ── LIABILITIES ──
  { code: '2000', name: 'Liabilities', type: 'Liability', isPandL: false },
  { code: '2100', name: 'Accounts Payable', type: 'Liability', isPandL: false, parentCode: '2000' },
  { code: '2200', name: 'GST Output Liability', type: 'Liability', isPandL: false, parentCode: '2000' },
  { code: '2210', name: 'CGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2220', name: 'SGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2230', name: 'IGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2300', name: 'TDS Payable', type: 'Liability', isPandL: false, parentCode: '2000' },

  // ── EQUITY ──
  { code: '3000', name: 'Equity', type: 'Equity', isPandL: false },
  { code: '3100', name: "Owner's Equity", type: 'Equity', isPandL: false, parentCode: '3000' },
  { code: '3200', name: 'Retained Earnings', type: 'Equity', isPandL: false, parentCode: '3000' },

  // ── REVENUE (P&L) ──
  { code: '4000', name: 'Revenue', type: 'Revenue', isPandL: true },
  { code: '4100', name: 'Sales Revenue', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4200', name: 'Commission Income (Buyer)', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4300', name: 'Commission Income (Seller)', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4400', name: 'Other Income', type: 'Revenue', isPandL: true, parentCode: '4000' },

  // ── EXPENSES (P&L) ──
  { code: '5000', name: 'Expenses', type: 'Expense', isPandL: true },
  { code: '5100', name: 'Cost of Goods Sold (COGS)', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5200', name: 'Commission Expense', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5300', name: 'General & Admin Expenses', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5400', name: 'Bank Charges', type: 'Expense', isPandL: true, parentCode: '5000' },
];

async function main() {
  console.log('🌱 Seeding Chart of Accounts...\n');

  // First pass: create all accounts without parent links
  const createdAccounts: Record<string, string> = {};

  for (const acct of accounts) {
    const created = await prisma.account.upsert({
      where: { code: acct.code },
      update: {
        name: acct.name,
        type: acct.type,
        isPandL: acct.isPandL,
      },
      create: {
        code: acct.code,
        name: acct.name,
        type: acct.type,
        isPandL: acct.isPandL,
      },
    });
    createdAccounts[acct.code] = created.id;
    console.log(`  ✓ ${acct.code} — ${acct.name} (${acct.type})`);
  }

  // Second pass: set parent relationships
  for (const acct of accounts) {
    if (acct.parentCode && createdAccounts[acct.parentCode]) {
      await prisma.account.update({
        where: { code: acct.code },
        data: { parentId: createdAccounts[acct.parentCode] },
      });
    }
  }

  console.log(`\n✅ Seeded ${accounts.length} accounts successfully.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
