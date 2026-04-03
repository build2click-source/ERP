'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface LedgerViewProps {
  onNavigate: (view: ViewId) => void;
}

export function LedgerView({ onNavigate }: LedgerViewProps) {
  const { data: clientsData, loading: cLoad } = useApi<any>('/api/clients?limit=100');
  const { data: invoicesData, loading: iLoad } = useApi<any>('/api/invoices?limit=100');
  const { data: receiptsData, loading: rLoad } = useApi<any>('/api/receipts?limit=100');

  const clients = clientsData?.data || [];
  const invoices = invoicesData?.data || [];
  const receipts = receiptsData?.data || [];

  const ledgerData = clients.map((c: any) => {
    const clientInvoices = invoices.filter((inv: any) => inv.clientId === c.id);
    const clientReceipts = receipts.filter((rcpt: any) => rcpt.clientId === c.id);
    const totalInvoiced = clientInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = clientReceipts.reduce((sum: number, rcpt: any) => sum + Number(rcpt.amount || 0), 0);
    return {
      client: c.name,
      type: c.type,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
    };
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Client Ledgers"
        description="View outstanding balances and financial summaries per client."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button variant="secondary"><Download size={16} /> Export CSV</Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'client',
            header: 'Client',
            render: (e) => (
              <span style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {e.client}
              </span>
            ),
          },
          { key: 'type', header: 'Type', render: (e) => <span style={{ color: 'var(--text-secondary)' }}>{e.type}</span> },
          {
            key: 'totalInvoiced',
            header: 'Total Invoiced',
            render: (e) => <span className="currency" style={{ color: 'var(--text-secondary)' }}>{formatINR(e.totalInvoiced)}</span>,
          },
          {
            key: 'totalPaid',
            header: 'Total Paid',
            render: (e) => <span className="currency" style={{ color: 'var(--text-secondary)' }}>{formatINR(e.totalPaid)}</span>,
          },
          {
            key: 'outstanding',
            header: 'Outstanding',
            render: (e) => (
              <span
                className="currency"
                style={{ fontWeight: 500, color: e.outstanding > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}
              >
                {formatINR(e.outstanding)}
              </span>
            ),
          },
        ]}
        data={ledgerData}
        loading={cLoad || iLoad || rLoad}
        renderRowActions={() => (
          <button style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Edit
          </button>
        )}
      />
    </div>
  );
}
