'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { EmptyState, Button } from '@/components/ui';
import { ViewId } from '@/components/layout/Sidebar';

interface TenuresViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TenuresView({ onNavigate }: TenuresViewProps) {
  return (
    <EmptyState
      icon={<LayoutDashboard size={32} style={{ color: 'var(--text-tertiary)' }} />}
      title="Billing Tenures"
      description="Configure automated billing cycles (monthly, quarterly, yearly). Tenure scheduling will be integrated with the invoicing engine."
      action={
        <Button variant="secondary" onClick={() => onNavigate('dashboard')}>
          Return to Dashboard
        </Button>
      }
    />
  );
}
