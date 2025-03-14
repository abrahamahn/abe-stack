import type * as apis from "../../server/apis/autoindex"
import { sleep } from "../../shared/sleep"

type InputOutput<T extends (...any: any[]) => any> = {
	input: Parameters<T>[1]
	output: ReturnType<T>
}

type Apis = typeof apis
type ApiSchema = { [K in keyof Apis]: InputOutput<Apis[K]["handler"]> }

// https://github.com/microsoft/TypeScript/issues/55095
type StatusCode = 0 | 200 | 400 | 409 | 424 | 403 | 500
type ErrorStatusCode = Exclude<StatusCode, 200>
type ErrorResponse = { status: ErrorStatusCode; body?: unknown }

type ApiResponse<T> = {
	success: boolean;
	data?: T;
	error?: string;
};

const debug = (...args: any[]) => console.log("api:", ...args)

export async function apiRequest<T extends keyof ApiSchema>(
	name: T,
	args: ApiSchema[T]["input"]
): Promise<ApiResponse<Awaited<ApiSchema[T]["output"]>>> {
	debug(name, JSON.stringify(args))

	const result = await httpRequest("/api/" + name, args)

	// Control how much loading spinners we see during development.
	await sleep(400)

	return result as ApiResponse<any>
}

export type ClientApi = {
	get: <T>(path: string) => Promise<ApiResponse<T>>;
	post: <T>(path: string, data?: any) => Promise<ApiResponse<T>>;
	put: <T>(path: string, data?: any) => Promise<ApiResponse<T>>;
	delete: <T>(path: string) => Promise<ApiResponse<T>>;
	upload: (path: string, file: File) => Promise<ApiResponse<string>>;
};

export function createApi(): ClientApi {
	const baseUrl = '/api';

	async function fetchApi<T>(
		method: string,
		path: string,
		data?: any
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
				const errorData = await response.json();
				return {
					success: false,
					error: errorData.message || `HTTP error ${response.status}`,
				};
			}

			const responseData = await response.json();
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

	async function uploadFile(
		path: string,
		file: File
	): Promise<ApiResponse<string>> {
		const url = `${baseUrl}${path}`;
		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await fetch(url, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				return {
					success: false,
					error: errorData.message || `HTTP error ${response.status}`,
				};
			}

			const responseData = await response.json();
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
		post: <T>(path: string, data?: any) => fetchApi<T>('POST', path, data),
		put: <T>(path: string, data?: any) => fetchApi<T>('PUT', path, data),
		delete: <T>(path: string) => fetchApi<T>('DELETE', path),
		upload: (path: string, file: File) => uploadFile(path, file),
	};
}

export function formatResponseError(response: ErrorResponse) {
	const { status, body } = response
	if (body === null) return `${status}: Unkown error.`
	if (body === undefined) return `${status}: Unkown error.`
	if (typeof body === "string") return body
	if (typeof body === "object") {
		if ("message" in body) {
			if (typeof body.message === "string") {
				return body.message
			}
		}
	}
	return `${status}: ${JSON.stringify(body)}`
}

export type HttpResponse<Body = any> = { status: 200; body: Body } | { status: number; body?: any }

// Only POST requests for now because this is only used for the API.
export async function httpRequest(url: string, args: any): Promise<HttpResponse> {
	let response: Response
	try {
		response = await fetch(url, {
			method: "post",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(args),
		})
	} catch (error) {
		// Offline
		return { status: 0 }
	}

	if (response.status === 200) {
		try {
			const body = await response.json()
			return { status: 200, body }
		} catch (error) {
			return { status: 200, body: {} }
		}
	}

	let body: any
	try {
		body = await response.json()
	} catch (error) {
		console.warn("Could not parse body of error response.")
	}

	return { status: response.status, body }
}
