/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

/** Minimal column definition (same shape the pages already use). No external table library needed. */
export interface Column<T> {
  id?: string;
  header?: ReactNode | (() => ReactNode);
  accessorKey?: string;
  cell?: (ctx: { row: { original: T }; getValue: () => any }) => ReactNode;
}
export type ColumnDef<T, _V = any> = Column<T>;

interface Props<T> {
  columns: Column<T>[];
  data: { results?: T[]; count?: number } | T[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  state?: { page?: number };
  onStateChange?: (patch: { page: number }) => void;
  rowActions?: (row: T) => ReactNode;
  rowHref?: (row: T) => string;
  emptyState?: ReactNode;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  state,
  onStateChange,
  rowActions,
  rowHref,
  emptyState,
  pageSize = 20,
}: Props<T>) {
  const items: T[] = (Array.isArray(data) ? data : data?.results) ?? [];
  const count = Array.isArray(data) ? data.length : (data?.count ?? items.length);
  const page = state?.page ?? 1;
  const pages = Math.max(1, Math.ceil(count / pageSize));

  if (isLoading) return <LoadingState variant="table" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (items.length === 0) return <>{emptyState ?? <EmptyState title="Nothing here yet" />}</>;

  const renderHeader = (c: Column<T>) => (typeof c.header === 'function' ? c.header() : c.header);
  const renderCell = (c: Column<T>, row: T): ReactNode => {
    const getValue = () => (c.accessorKey ? (row as any)?.[c.accessorKey] : undefined);
    if (c.cell) return c.cell({ row: { original: row }, getValue });
    const v = getValue();
    return v === undefined || v === null || v === '' ? '—' : String(v);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={c.id ?? c.accessorKey ?? i} className="whitespace-nowrap">
                  {renderHeader(c)}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row, r) => (
              <TableRow key={(row as any)?.id ?? r}>
                {columns.map((c, i) => {
                  const content = renderCell(c, row);
                  return (
                    <TableCell key={c.id ?? c.accessorKey ?? i}>
                      {i === 0 && rowHref ? (
                        <Link to={rowHref(row)} className="font-medium underline-offset-4 hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  );
                })}
                {rowActions && <TableCell>{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!Array.isArray(data) && count > pageSize && onStateChange && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span>
            Page {page} of {pages} ({count} total)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onStateChange({ page: page - 1 })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onStateChange({ page: page + 1 })}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
