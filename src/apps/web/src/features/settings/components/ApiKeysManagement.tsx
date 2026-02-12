// src/apps/web/src/features/settings/components/ApiKeysManagement.tsx
/**
 * ApiKeysManagement
 *
 * Component for managing API keys in the settings page.
 * Supports listing, creating, revoking, and deleting API keys.
 */

import { formatDate } from '@abe-stack/shared';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Heading,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { useApiKeys, useCreateApiKey, useDeleteApiKey, useRevokeApiKey } from '../hooks/useApiKeys';

import { ApiKeyScopeSelector } from './ApiKeyScopeSelector';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ApiKeysManagementProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ApiKeysManagement({ className }: ApiKeysManagementProps): ReactElement {
  const { apiKeys, isLoading, isError, error, refetch } = useApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read']);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createApiKey = useCreateApiKey({
    onSuccess: (response) => {
      setPlaintextKey(response.plaintext);
      setNewKeyName('');
      setShowCreate(false);
      void refetch();
    },
  });

  const revokeApiKey = useRevokeApiKey({
    onSuccess: () => {
      void refetch();
    },
  });
  const deleteApiKey = useDeleteApiKey({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleCreate = useCallback(() => {
    if (newKeyName.trim() === '') return;
    createApiKey.createKey({ name: newKeyName.trim(), scopes: selectedScopes });
  }, [newKeyName, selectedScopes, createApiKey]);

  const handleScopeToggle = useCallback((scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }, []);

  const handleCopy = useCallback(() => {
    if (plaintextKey === null) return;
    void navigator.clipboard.writeText(plaintextKey).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }, [plaintextKey]);

  const handleDismissKey = useCallback(() => {
    setPlaintextKey(null);
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <Alert tone="danger">{error?.message ?? 'Failed to load API keys'}</Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <Heading as="h3">API Keys</Heading>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => {
            setShowCreate(!showCreate);
          }}
        >
          {showCreate ? 'Cancel' : 'Create Key'}
        </Button>
      </div>

      {plaintextKey !== null && (
        <Alert tone="warning" className="mb-4">
          <Text size="sm">Copy your API key now. It will not be shown again.</Text>
          <div className="flex items-center gap-2 mt-2">
            <Input value={plaintextKey} readOnly className="font-mono flex-1" />
            <Button type="button" variant="secondary" size="small" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button type="button" variant="text" size="small" onClick={handleDismissKey}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {showCreate && (
        <div className="mb-4 p-4 bg-surface rounded border border-border">
          <div className="flex flex-col gap-1">
            <Text as="label" size="sm" tone="muted">
              Key Name
            </Text>
            <Input
              placeholder="e.g. CI/CD Pipeline"
              value={newKeyName}
              onChange={(e: { target: { value: string } }) => {
                setNewKeyName(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1 mt-3">
            <Text as="label" size="sm" tone="muted">
              Scopes
            </Text>
            <ApiKeyScopeSelector
              selectedScopes={selectedScopes}
              onToggleScope={handleScopeToggle}
              disabled={createApiKey.isLoading}
            />
          </div>
          {createApiKey.isError && (
            <Alert tone="danger" className="mt-2">
              {createApiKey.error?.message ?? 'Failed to create key'}
            </Alert>
          )}
          <Button
            type="button"
            variant="primary"
            size="small"
            className="mt-3"
            onClick={handleCreate}
            disabled={createApiKey.isLoading || newKeyName.trim() === '' || selectedScopes.length === 0}
          >
            {createApiKey.isLoading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Create one to get started"
          action={{ label: 'Create API Key', onClick: () => { setShowCreate(true); } }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id} className="hover-row">
                <TableCell>
                  <Text size="sm">{key.name}</Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" className="font-mono">
                    {key.keyPrefix}...
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm">{formatDate(key.createdAt)}</Text>
                </TableCell>
                <TableCell>
                  <Text size="sm">{key.lastUsedAt === null ? 'Never' : formatDate(key.lastUsedAt)}</Text>
                </TableCell>
                <TableCell>
                  {key.revokedAt !== null ? (
                    <Badge tone="danger">Revoked</Badge>
                  ) : key.expiresAt !== null && new Date(key.expiresAt) < new Date() ? (
                    <Badge tone="warning">Expired</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {key.revokedAt === null && (
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        className="text-danger"
                        onClick={() => {
                          revokeApiKey.revokeKey(key.id);
                        }}
                        disabled={revokeApiKey.isLoading}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      className="text-danger"
                      onClick={() => {
                        deleteApiKey.deleteKey(key.id);
                      }}
                      disabled={deleteApiKey.isLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
