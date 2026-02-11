// src/client/ui/src/components/EmptyState.tsx
import { Button } from '@elements/Button';
import { Heading } from '@elements/Heading';
import { Text } from '@elements/Text';

import { cn } from '../utils/cn';

import '../styles/utilities.css';

import type { ReactElement, ReactNode } from 'react';

/** Props for the EmptyState component. */
export type EmptyStateProps = {
  /** Optional icon to display above the title */
  icon?: ReactNode;
  /** Title text describing the empty state */
  title: string;
  /** Optional description text with additional context */
  description?: string;
  /** Optional call-to-action button */
  action?: { label: string; onClick: () => void };
  /** Additional CSS class names */
  className?: string;
};

/**
 * A placeholder component for empty content areas.
 *
 * Provides a consistent visual pattern for states where no data exists yet,
 * with optional icon, description, and call-to-action.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No items yet"
 *   description="Create your first item to get started"
 *   action={{ label: "Create Item", onClick: handleCreate }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): ReactElement {
  return (
    <div className={cn('empty-state', className)} role="status">
      <div className="flex-col items-center" style={{ gap: 'var(--ui-gap-sm)' }}>
        {icon !== undefined ? (
          <div style={{ fontSize: 'var(--ui-font-size-xl)' }} aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <Heading as="h3" size="sm" className="text-center">
          {title}
        </Heading>
        {description !== undefined ? (
          <Text tone="muted" className="text-center">
            {description}
          </Text>
        ) : null}
        {action !== undefined ? (
          <div style={{ marginTop: 'var(--ui-gap-md)' }}>
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
