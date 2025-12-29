import { apiContract } from '@abe-stack/shared';
import { initQueryClient } from '@ts-rest/react-query';

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

export type ReactQueryClientInstance = unknown;

export function createReactQueryClient(options: CreateApiOptions): ReactQueryClientInstance {
  const { baseUrl, getToken, onUnauthorized, onServerError, fetchImpl = fetch } = options;

  const client = initQueryClient(apiContract, {
    baseUrl,
    baseHeaders: {},
    api: async ({
      path,
      method,
      headers,
      body,
      credentials,
    }: ApiCallArgs): Promise<{ status: number; body: unknown; headers: Headers }> => {
      const token = getToken?.();
      const nextHeaders = new Headers(headers);
      if (token) nextHeaders.set('Authorization', `Bearer ${token}`);
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
  });

  return client as ReactQueryClientInstance;
}
