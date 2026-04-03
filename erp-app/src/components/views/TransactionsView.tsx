'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select } from '@/components/ui';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface TransactionsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TransactionsView({ onNavigate }: TransactionsViewProps) {
  const { data: trxData, loading } = useApi<any>('/api/transactions?limit=100');
  const transactions = trxData?.data || [];

  // Flatten the transactions into journal entry lines
  const flatLines = transactions.flatMap((trx: any) => 
    (trx.journalEntries || []).map((je: any) => ({
      id: je.id,
      type: trx.metadata?.type || 'Journal',
      no: trx.referenceId || trx.id.split('-')[0].toUpperCase(),
      date: new Date(trx.createdAt).toLocaleDateString(),
      particulars: `${je.account.name} — ${trx.description || ''}`,
      drAmt: je.entryType === 'Dr' ? je.amount : null,
      crAmt: je.entryType === 'Cr' ? Math.abs(je.amount) : null,
    }))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Transaction Details"
        description="Detailed ledger of all system transactions."
        actions={
          <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Return to Dashboard</Button>
        }
      />

      <Card padding={false}>
        {/* Filters */}
        <div
          style={{
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-container-low)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <Select
              label="Select Client"
              options={[
                { value: '', label: '-- All Clients --' },
              ]}
            />
          </div>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Input type="date" defaultValue="2026-04-01" />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>-</span>
              <Input type="date" defaultValue="2026-04-30" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button>Apply Filters</Button>
            <Button variant="secondary"><Download size={16} /> PDF</Button>
          </div>
        </div>

        {/* Transaction Table — special layout with Debit/Credit columns */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Type</th>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Ref No</th>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Date</th>
                <th style={{ width: '34%', borderRight: '1px solid var(--border-subtle)' }}>Particulars</th>
                <th style={{ width: '15%', textAlign: 'right', borderRight: '1px solid var(--border-subtle)' }}>Debit (Dr)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {flatLines.length > 0 ? (
                flatLines.map((trx: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, borderRight: '1px solid var(--border-subtle)', textTransform: 'capitalize' }}>{trx.type.replace('_', ' ')}</td>
                    <td style={{ fontFamily: 'var(--font-technical)', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-subtle)' }}>{trx.no}</td>
                    <td style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border-subtle)' }}>{trx.date}</td>
                    <td style={{ borderRight: '1px solid var(--border-subtle)' }}>{trx.particulars}</td>
                    <td className="currency" style={{ textAlign: 'right', borderRight: '1px solid var(--border-subtle)' }}>
                      {trx.drAmt ? formatINR(trx.drAmt) : '-'}
                    </td>
                    <td className="currency" style={{ textAlign: 'right' }}>
                      {trx.crAmt ? formatINR(trx.crAmt) : '-'}
                    </td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No transactions match your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
