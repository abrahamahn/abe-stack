// main/apps/web/src/features/workspace/components/DomainAllowlistEditor.tsx
/**
 * Domain Allowlist Editor
 *
 * Chip/tag input for managing workspace email domain restrictions.
 * Users can add domains (Enter key) and remove them (X button).
 */

import { Alert, Badge, Button, CloseButton, FormField, Input } from '@abe-stack/ui';
import { useState, type ReactElement, type ChangeEvent } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface DomainAllowlistEditorProps {
  /** Current allowed domains */
  domains: string[];
  /** Called with updated domain list when domains change */
  onChange: (domains: string[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// ============================================================================
// Validation
// ============================================================================

/** Basic domain format: alphanumeric segments separated by dots, valid TLD */
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain.toLowerCase());
}

// ============================================================================
// Component
// ============================================================================

export const DomainAllowlistEditor = ({
  domains,
  onChange,
  disabled = false,
}: DomainAllowlistEditorProps): ReactElement => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addDomain = (): void => {
    const domain = inputValue.trim().toLowerCase().replace(/^@/, '');
    setError(null);

    if (domain === '') return;

    if (!isValidDomain(domain)) {
      setError('Invalid domain format. Enter a domain like "example.com"');
      return;
    }

    if (domains.includes(domain)) {
      setError('Domain already added');
      return;
    }

    onChange([...domains, domain]);
    setInputValue('');
  };

  const removeDomain = (domain: string): void => {
    onChange(domains.filter((d) => d !== domain));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDomain();
    }
  };

  return (
    <div className="space-y-3">
      <FormField
        label="Allowed Email Domains"
        htmlFor="domain-input"
        description="Only users with these email domains can be invited. Leave empty to allow all domains."
      >
        <div className="flex gap-2">
          <Input
            id="domain-input"
            type="text"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="example.com"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addDomain}
            disabled={disabled || inputValue.trim() === ''}
          >
            Add
          </Button>
        </div>
      </FormField>

      {error !== null && <Alert tone="danger">{error}</Alert>}

      {domains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <Badge key={domain} tone="info">
              <span className="flex items-center gap-1">
                {domain}
                {!disabled && (
                  <CloseButton
                    aria-label={`Remove ${domain}`}
                    onClick={() => {
                      removeDomain(domain);
                    }}
                  />
                )}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
