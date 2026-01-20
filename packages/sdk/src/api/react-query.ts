// packages/sdk/src/api/react-query.ts
import { addAuthHeader, apiContract } from '@abe-stack/core';
import { initQueryClient } from '@ts-rest/react-query';

import type { TsRestReactQueryClient } from '@ts-rest/react-query';

type ApiCallArgs = {
  path: string;
  method: string;
  headers: HeadersInit;
  body?: unknown;
  credentials?: RequestCredentials;
};

export type CreateApiOptions = {
  baseUrl: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onServerError?: (message?: string) => void;
  fetchImpl?: typeof fetch;
};

/** Internal API client config matching the shape passed to initQueryClient */
interface ApiClientConfig {
  baseUrl: string;
  baseHeaders: Record<string, string>;
  api: (args: ApiCallArgs) => Promise<{ status: number; body: unknown; headers: Headers }>;
}

/** Typed React Query client based on the API contract */
export type ReactQueryClientInstance = TsRestReactQueryClient<typeof apiContract, ApiClientConfig>;

function createClientInternal(options: CreateApiOptions): ReactQueryClientInstance {
  const { baseUrl, getToken, onUnauthorized, onServerError, fetchImpl = fetch } = options;

  return initQueryClient(apiContract, {
    baseUrl,
    baseHeaders: {},
    api: async ({
      path,
      method,
      headers,
      body,
      credentials,
    }: ApiCallArgs): Promise<{ status: number; body: unknown; headers: Headers }> => {
      const nextHeaders = new Headers(headers);
      addAuthHeader(nextHeaders, getToken?.());
      nextHeaders.set('Content-Type', 'application/json');

      const res = await fetchImpl(path, {
        method,
        headers: nextHeaders,
        credentials,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json: unknown = await res.json().catch(() => undefined);

      if (!res.ok) {
        if (res.status === 401) onUnauthorized?.();
        if (res.status >= 500) {
          const message =
            typeof json === 'object' && json && 'message' in json
              ? (json as { message?: string }).message
              : undefined;
          onServerError?.(message ?? res.statusText);
        }
        return {
          status: res.status,
          body: json,
          headers: res.headers,
        };
      }

      return {
        status: res.status,
        body: json,
        headers: res.headers,
      };
    },
  }) as ReactQueryClientInstance;
}

export function createReactQueryClient(options: CreateApiOptions): ReactQueryClientInstance {
  return createClientInternal(options);
}
