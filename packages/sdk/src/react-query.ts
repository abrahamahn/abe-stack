// packages/api-client/src/react-query.ts
import { addAuthHeader, apiContract } from '@abe-stack/contracts';
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createClient(options: CreateApiOptions) {
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
  });
}

/** Typed React Query client based on the API contract */
export type ReactQueryClientInstance = ReturnType<typeof createClient>;

export function createReactQueryClient(options: CreateApiOptions): ReactQueryClientInstance {
  return createClient(options);
}
