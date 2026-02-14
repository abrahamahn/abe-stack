// main/client/ui/src/components/CardAsyncState.tsx
import { Alert } from '../elements/Alert';
import { Text } from '../elements/Text';

import { Card } from './Card';

import type { ReactElement, ReactNode } from 'react';

export interface CardAsyncStateProps {
  isLoading?: boolean;
  errorMessage?: string | null;
  loadingContent?: ReactNode;
  errorContent?: ReactNode;
  cardClassName?: string;
  children?: ReactNode;
}

export const CardAsyncState = ({
  isLoading = false,
  errorMessage = null,
  loadingContent,
  errorContent,
  cardClassName = 'p-4',
  children = null,
}: CardAsyncStateProps): ReactElement | null => {
  if (isLoading) {
    return (
      <Card className={cardClassName}>
        {loadingContent ?? <Text tone="muted">Loading...</Text>}
      </Card>
    );
  }

  if (errorMessage !== null) {
    return (
      <Card className={cardClassName}>
        {errorContent ?? <Alert tone="danger">{errorMessage}</Alert>}
      </Card>
    );
  }

  return children === null ? null : <>{children}</>;
};
