/**
 * SNAPSHOT ENGINE
 * 
 * Generates month-end account snapshots to accelerate balance queries.
 * 
 * For each account, computes the cumulative balance up to the period end
 * and stores it in account_snapshots. Subsequent balance queries use:
 *   Live Balance = snapshot.balance + SUM(entries after snapshot_end)
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate snapshots for all accounts for a given month.
 * 
 * @param year - e.g. 2026
 * @param month - 1-12
 * @returns number of snapshots created/updated
 */
export async function generateMonthEndSnapshots(
  year: number,
  month: number
): Promise<number> {
  const periodStart = new Date(year, month - 1, 1);  // First day of month
  const periodEnd = new Date(year, month, 0);          // Last day of month
  
  // Set time to end of day
  periodEnd.setHours(23, 59, 59, 999);

  console.log(`📸 Generating snapshots for ${year}-${String(month).padStart(2, '0')}...`);
  console.log(`   Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);

  // Get all accounts
  const accounts = await prisma.account.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  let created = 0;

  for (const account of accounts) {
    // Check if prior snapshot exists
    const priorSnapshot = await prisma.accountSnapshot.findFirst({
      where: {
        accountId: account.id,
        periodEnd: { lt: periodStart },
      },
      orderBy: { periodEnd: 'desc' },
    });

    let balance: number;

    if (priorSnapshot) {
      // Build on prior snapshot + delta entries in this period
      const delta = await prisma.journalEntry.aggregate({
        _sum: { amount: true },
        where: {
          accountId: account.id,
          createdAt: {
            gt: priorSnapshot.periodEnd,
            lte: periodEnd,
          },
          transaction: {
            postedAt: { not: null },
          },
        },
      });
      balance = Number(priorSnapshot.balance) + Number(delta._sum.amount || 0);
    } else {
      // No prior snapshot — sum all entries up to period end
      const total = await prisma.journalEntry.aggregate({
        _sum: { amount: true },
        where: {
          accountId: account.id,
          createdAt: { lte: periodEnd },
          transaction: {
            postedAt: { not: null },
          },
        },
      });
      balance = Number(total._sum.amount || 0);
    }

    // Upsert the snapshot
    await prisma.accountSnapshot.upsert({
      where: {
        accountId_periodStart_periodEnd: {
          accountId: account.id,
          periodStart,
          periodEnd,
        },
      },
      update: {
        balance: new Prisma.Decimal(balance),
      },
      create: {
        id: uuidv4(),
        accountId: account.id,
        periodStart,
        periodEnd,
        balance: new Prisma.Decimal(balance),
      },
    });

    if (Math.abs(balance) > 0.001) {
      console.log(`  ✓ ${account.code} ${account.name}: ₹${balance.toFixed(2)}`);
    }

    created++;
  }

  console.log(`\n✅ Generated ${created} snapshots for ${year}-${String(month).padStart(2, '0')}`);
  return created;
}
