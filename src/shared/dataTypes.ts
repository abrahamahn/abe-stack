import * as t from 'data-type-ts';

// Define a Validator interface to match what's expected
export interface Validator<T> {
	validate(value: unknown): T;
}

// Create a custom validator function
function createValidator<T>(
	validateFn: (value: unknown) => boolean,
	name: string
): Validator<T> {
	return {
		validate(value: unknown): T {
			if (validateFn(value)) {
				return value as T;
			}
			throw new Error(`Invalid ${name}: ${String(value)}`);
		}
	};
}

// UUID validator
export const uuid = createValidator<string>(
	(value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
	'UUID'
);

// ISO 8601 datetime validator
export const datetime = createValidator<string>(
	(value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value),
	'ISO 8601 datetime'
);

// Email validator
export const email = createValidator<string>(
	(value) => typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
	'Email'
);
