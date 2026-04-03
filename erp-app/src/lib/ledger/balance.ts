/**
 * BALANCE ENGINE
 * 
 * Computes account balances using the snapshot-assisted formula:
 *   Live Balance = snapshot.balance + SUM(journal_entries after snapshot_end)
 * 
 * If no snapshot exists, sums all journal entries from the beginning.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
  asOf: Date;
  snapshotUsed: boolean;
}

/**
 * Get the live balance for a single account.
 * Uses the most recent snapshot if available, then adds any entries after.
 */
export async function getAccountBalance(
  accountId: string,
  asOf?: Date
): Promise<AccountBalance> {
  const effectiveDate = asOf || new Date();

  // Fetch account info
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, code: true, name: true, type: true },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Try to find the most recent snapshot
  const snapshot = await prisma.accountSnapshot.findFirst({
    where: {
      accountId,
      periodEnd: { lte: effectiveDate },
    },
    orderBy: { periodEnd: 'desc' },
  });

  let balance: number;
  let snapshotUsed = false;

  if (snapshot) {
    // Snapshot found — add delta since snapshot end
    snapshotUsed = true;
    const delta = await prisma.journalEntry.aggregate({
      _sum: { amount: true },
      where: {
        accountId,
        createdAt: {
          gt: snapshot.periodEnd,
          lte: effectiveDate,
        },
        transaction: {
          postedAt: { not: null }, // Only count posted transactions
        },
      },
    });

    balance = Number(snapshot.balance) + Number(delta._sum.amount || 0);
  } else {
    // No snapshot — sum all posted entries
    const total = await prisma.journalEntry.aggregate({
      _sum: { amount: true },
      where: {
        accountId,
        createdAt: { lte: effectiveDate },
        transaction: {
          postedAt: { not: null },
        },
      },
    });

    balance = Number(total._sum.amount || 0);
  }

  return {
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    balance,
    asOf: effectiveDate,
    snapshotUsed,
  };
}

/**
 * Get balances for all accounts of a given type.
 */
export async function getBalancesByType(
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense',
  asOf?: Date
): Promise<AccountBalance[]> {
  const accounts = await prisma.account.findMany({
    where: { type },
    select: { id: true },
    orderBy: { code: 'asc' },
  });

  const balances = await Promise.all(
    accounts.map((a) => getAccountBalance(a.id, asOf))
  );

  return balances;
}

/**
 * Get a trial balance — all accounts with non-zero balances.
 * Returns total debits and credits which must be equal (verification).
 */
export async function getTrialBalance(asOf?: Date): Promise<{
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}> {
  const allAccounts = await prisma.account.findMany({
    select: { id: true },
    orderBy: { code: 'asc' },
  });

  const balances = await Promise.all(
    allAccounts.map((a) => getAccountBalance(a.id, asOf))
  );

  // Filter to non-zero balances
  const nonZero = balances.filter((b) => Math.abs(b.balance) > 0.001);

  const totalDebits = nonZero
    .filter((b) => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0);

  const totalCredits = nonZero
    .filter((b) => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0);

  return {
    accounts: nonZero,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}
