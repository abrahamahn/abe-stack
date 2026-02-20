// main/apps/web/src/features/workspace/components/WorkspaceInvoiceList.tsx
/**
 * Workspace Invoice List
 *
 * Displays a list of invoices for the workspace. Uses the InvoiceList
 * component from @bslt/ui and the useWorkspaceInvoices hook.
 */

import { Card, Heading, Skeleton, Text } from '@bslt/ui';
import { InvoiceList } from '@bslt/ui/components/billing';

import { useWorkspaceInvoices } from '../hooks/useWorkspaceInvoices';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceInvoiceListProps {
  tenantId: string;
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceInvoiceList = ({ tenantId }: WorkspaceInvoiceListProps): ReactElement => {
  const { invoices, hasMore, isLoading, error } = useWorkspaceInvoices(tenantId);

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <Heading as="h3" size="md" className="mb-4">
            Invoices
          </Heading>
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error !== null) {
    return (
      <Card>
        <Card.Body>
          <Heading as="h3" size="md" className="mb-4">
            Invoices
          </Heading>
          <Text tone="danger">{error.message}</Text>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <Heading as="h3" size="md" className="mb-4">
          Invoices
        </Heading>
        <Text tone="muted" size="sm" className="mb-4">
          View and download your past invoices.
        </Text>
        <InvoiceList invoices={invoices} hasMore={hasMore} isLoading={isLoading} />
      </Card.Body>
    </Card>
  );
};
