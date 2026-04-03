'use client';

import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button } from './index';

/* ============================================================
   DATA TABLE COMPONENT
   Reusable table with search, filter, pagination
   Per PRD: no vertical borders, row-striping/hover
   ============================================================ */

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  onSearch,
  renderRowActions,
  emptyMessage = 'No results found.',
  loading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <Card padding={false}>
      {/* Toolbar */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            style={{
              display: 'flex',
              height: '36px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-container)',
              paddingLeft: '36px',
              paddingRight: '12px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        </div>
        <Button variant="secondary" size="sm">
          <Filter size={14} /> Filters
        </Button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: col.align || 'left',
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
              {renderRowActions && (
                <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td style={{ textAlign: 'right' }}>{renderRowActions(row)}</td>
                  )}
                </tr>
              ))
            ) : loading ? (
              <tr>
                <td colSpan={columns.length + (renderRowActions ? 1 : 0)} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading data...
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  style={{
                    padding: 'var(--space-10)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{data.length}</strong> results
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }}>
            <ChevronLeft size={14} /> Previous
          </Button>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
