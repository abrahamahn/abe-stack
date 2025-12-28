import { sleep } from '../../server/infrastructure/lifecycle/sleep';

// Define a minimal API schema type since we don't have a full API setup yet
type ApiSchema = Record<
  string,
  {
    input: Record<string, unknown>;
    output: unknown;
  }
>;

// https://github.com/microsoft/TypeScript/issues/55095
type StatusCode = 0 | 200 | 400 | 409 | 424 | 403 | 500;
type ErrorStatusCode = Exclude<StatusCode, 200>;
type ErrorResponse = { status: ErrorStatusCode; body?: unknown };

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const debug = (...args: unknown[]) => console.log('api:', ...args);

export async function apiRequest<T extends keyof ApiSchema>(
  name: T,
  args: ApiSchema[T]['input'],
): Promise<ApiResponse<Awaited<ApiSchema[T]['output']>>> {
  debug(name, JSON.stringify(args));

  const result = await httpRequest(`/api/${String(name)}`, args);

  // Control how much loading spinners we see during development.
  await sleep(400);

  // Convert HttpResponse to ApiResponse
  if (result.status === 200) {
    return {
      success: true,
      data: result.body as Awaited<ApiSchema[T]['output']>,
    };
  } else {
    return {
      success: false,
      error: formatResponseError(result as ErrorResponse),
    };
  }
}

export type ClientApi = {
  get: <T>(path: string) => Promise<ApiResponse<T>>;
  post: <T>(path: string, data?: Record<string, unknown>) => Promise<ApiResponse<T>>;
  put: <T>(path: string, data?: Record<string, unknown>) => Promise<ApiResponse<T>>;
  delete: <T>(path: string) => Promise<ApiResponse<T>>;
  upload: (path: string, file: File) => Promise<ApiResponse<string>>;
};

export function createApi(): ClientApi {
  const baseUrl = '/api';

  async function fetchApi<T>(
    method: string,
    path: string,
    data?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    const url = `${baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        return {
          success: false,
          error: errorData.message || `HTTP error ${response.status}`,
        };
      }

      const responseData = (await response.json()) as T;
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async function uploadFile(path: string, file: File): Promise<ApiResponse<string>> {
    const url = `${baseUrl}${path}`;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        return {
          success: false,
          error: errorData.message || `HTTP error ${response.status}`,
        };
      }

      const responseData = (await response.json()) as { url: string };
      return {
        success: true,
        data: responseData.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return {
    get: <T>(path: string) => fetchApi<T>('GET', path),
    post: <T>(path: string, data?: Record<string, unknown>) => fetchApi<T>('POST', path, data),
    put: <T>(path: string, data?: Record<string, unknown>) => fetchApi<T>('PUT', path, data),
    delete: <T>(path: string) => fetchApi<T>('DELETE', path),
    upload: (path: string, file: File) => uploadFile(path, file),
  };
}

export function formatResponseError(response: ErrorResponse) {
  const { status, body } = response;
  if (body === null) return `${status}: Unkown error.`;
  if (body === undefined) return `${status}: Unkown error.`;
  if (typeof body === 'string') return body;
  if (typeof body === 'object') {
    if ('message' in body) {
      if (typeof body.message === 'string') {
        return body.message;
      }
    }
  }
  return `${status}: ${JSON.stringify(body)}`;
}

export type HttpResponse<Body = unknown> =
  | { status: 200; body: Body }
  | { status: number; body?: unknown };

// Only POST requests for now because this is only used for the API.
export async function httpRequest(url: string, args: unknown): Promise<HttpResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'post',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch (_error) {
    // Offline
    return { status: 0 };
  }

  if (response.status === 200) {
    try {
      const body = (await response.json()) as unknown;
      return { status: 200, body };
    } catch (_error) {
      return { status: 200, body: {} };
    }
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (_error) {
    console.warn('Could not parse body of error response.');
  }

  return { status: response.status, body };
}
