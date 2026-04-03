'use client';

import React, { useState } from 'react';
import { Plus, FileUp } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, Textarea } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface ClientsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: clients, loading, error, revalidate } = useApi<any[]>('/api/clients', []);

  if (isCreating) {
    return <ClientForm onCancel={() => setIsCreating(false)} onSuccess={() => {
      setIsCreating(false);
      revalidate();
    }} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Client Management"
        description="Manage all buyer and seller profiles."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Client
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'name',
            header: 'Client Name',
            render: (c) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  ID: {c.id.toString().padStart(4, '0')}
                </p>
              </div>
            ),
          },
          { key: 'type', header: 'Type', render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.type}</span> },
          { key: 'contact', header: 'Contact', render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.contact}</span> },
          {
            key: 'status',
            header: 'Status',
            render: (c) => (
              <Badge variant={c.status === 'active' ? 'success' : 'default'}>{c.status}</Badge>
            ),
          },
        ]}
        data={clients || []}
        loading={loading}
        renderRowActions={() => (
          <button style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Edit
          </button>
        )}
      />
    </div>
  );
}

/* ============================================================
   CLIENT CREATION FORM
   ============================================================ */
function ClientForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const [loadingGst, setLoadingGst] = useState(false);
  const [saving, setSaving] = useState(false);
  const { mutate } = useApi('/api/clients');
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    type: 'Both',
    doj: '2026-04-01',
    address: '',
    pincode: '',
    contact: '',
    city: '',
    state: '',
    email: '',
    gstin: ''
  });

  const handleGstinLookup = async () => {
    if (!formData.gstin || formData.gstin.length !== 15) return;
    setLoadingGst(true);
    try {
      const res = await fetch(`/api/gstin/${formData.gstin}`);
      const json = await res.json();
      if (json.success && json.data.valid) {
        setFormData(prev => ({
          ...prev,
          name: json.data.tradeName || json.data.legalName || prev.name,
          address: json.data.address.fullAddress || prev.address,
          pincode: json.data.address.pincode || prev.pincode,
          city: json.data.address.district || prev.city,
          state: json.data.address.state || prev.state,
        }));
      }
    } catch (e) {
      console.error('GSTIN lookup failed', e);
    } finally {
      setLoadingGst(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutate('POST', {
        code: formData.alias || formData.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 1000),
        name: formData.name,
        type: formData.type === 'Buyer' ? 'Customer' : formData.type === 'Seller' ? 'Vendor' : 'Both',
        gstin: formData.gstin || undefined,
        placeOfSupply: formData.state || undefined,
        defaultCurrency: 'INR',
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Create Client Profile"
        description="Add a new buyer, seller, or dual-role client to the system."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Saving...' : 'Save Client'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Billing & Compliance - Moved to top for GSTIN auto-fill */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Billing & Compliance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div>
                <Input 
                  label="Tax ID / GSTIN" 
                  placeholder="Enter 15-digit GSTIN" 
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  style={{ marginTop: 'var(--space-2)' }}
                  onClick={handleGstinLookup}
                  disabled={loadingGst || formData.gstin.length !== 15}
                >
                  {loadingGst ? 'Verifying...' : 'Verify & Auto-fill'}
                </Button>
              </div>
              <Input 
                label="Billing Email Address" 
                type="email" 
                placeholder="billing@company.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </section>

          {/* Basic Details */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Basic Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Input 
                  label="Client Name" 
                  placeholder="Acme Corporation" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <Input 
                label="Alias Name" 
                placeholder="Acme" 
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              />
              <Select
                label="Client Type"
                options={[
                  { value: 'Buyer', label: 'Buyer' },
                  { value: 'Seller', label: 'Seller' },
                  { value: 'Both', label: 'Both' },
                ]}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
              <Input 
                label="Date of Joining" 
                type="date" 
                value={formData.doj}
                onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
              />
            </div>
          </section>

          {/* Contact & Location */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Contact & Location
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Textarea 
                  label="Full Address" 
                  placeholder="123 Business Rd, Suite 100..." 
                  rows={2} 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Input 
                label="Pincode / Zip Code" 
                placeholder="Enter Pincode" 
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
              <Input 
                label="Primary Contact Number" 
                placeholder="+91 98765 43210" 
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
              <Input label="City" placeholder="Auto-filled" disabled value={formData.city} />
              <Input label="State / Region" placeholder="Auto-filled" disabled value={formData.state} />
            </div>
          </section>
        </div>
      </Card>

      {/* Bulk Upload Callout */}
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-container-low)',
          padding: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Import multiple clients</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '4px' }}>Use our CSV template to upload clients in bulk.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm">Download Template</Button>
          <Button variant="secondary" size="sm"><FileUp size={16} /> Upload CSV</Button>
        </div>
      </div>
    </div>
  );
}
