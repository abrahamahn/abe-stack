// src/apps/web/src/features/settings/components/ApiKeyScopeSelector.tsx

import { Checkbox, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

const AVAILABLE_SCOPES = ['read', 'write', 'admin'] as const;

export interface ApiKeyScopeSelectorProps {
  selectedScopes: string[];
  onToggleScope: (scope: string) => void;
  disabled?: boolean;
}

export function ApiKeyScopeSelector({
  selectedScopes,
  onToggleScope,
  disabled = false,
}: ApiKeyScopeSelectorProps): ReactElement {
  return (
    <div className="flex gap-4" aria-label="API key scopes">
      {AVAILABLE_SCOPES.map((scope) => (
        <Checkbox
          key={scope}
          checked={selectedScopes.includes(scope)}
          onChange={() => {
            if (!disabled) {
              onToggleScope(scope);
            }
          }}
          data-testid={`scope-${scope}`}
          label={<Text size="sm">{scope.charAt(0).toUpperCase() + scope.slice(1)}</Text>}
        />
      ))}
    </div>
  );
}
