// Define a Validator interface to match what's expected
export interface Validator<T> {
	validate(value: unknown): T;
}

// Create a custom validator function
export function createValidator<T>(
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

// Basic type validators
export const string = (): Validator<string> => 
	createValidator<string>((value) => typeof value === 'string', 'string');

export const number = (): Validator<number> => 
	createValidator<number>((value) => typeof value === 'number' && !isNaN(value), 'number');

export const boolean = (): Validator<boolean> => 
	createValidator<boolean>((value) => typeof value === 'boolean', 'boolean');

// Complex type validators
export function object<T extends Record<string, Validator<unknown>>>(schema: T): Validator<{
	[K in keyof T]: T[K] extends Validator<infer U> ? U : never;
}> {
	return {
		validate(value: unknown): { [K in keyof T]: T[K] extends Validator<infer U> ? U : never } {
			if (typeof value !== 'object' || value === null) {
				throw new Error(`Invalid object: ${String(value)}`);
			}

			const result: Record<string, unknown> = {};
			for (const key in schema) {
				if (Object.prototype.hasOwnProperty.call(schema, key)) {
					try {
						result[key] = schema[key].validate((value as Record<string, unknown>)[key]);
					} catch (error) {
						throw new Error(`Invalid property ${key}: ${(error as Error).message}`);
					}
				}
			}
			return result as { [K in keyof T]: T[K] extends Validator<infer U> ? U : never };
		}
	};
}

export function array<T>(itemValidator: Validator<T>): Validator<T[]> {
	return {
		validate(value: unknown): T[] {
			if (!Array.isArray(value)) {
				throw new Error(`Invalid array: ${String(value)}`);
			}

			return value.map((item, index) => {
				try {
					return itemValidator.validate(item);
				} catch (error) {
					throw new Error(`Invalid item at index ${index}: ${(error as Error).message}`);
				}
			});
		}
	};
}

// Optional and nullable validators
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
	return {
		validate(value: unknown): T | undefined {
			if (value === undefined) {
				return undefined;
			}
			return validator.validate(value);
		}
	};
}

export function nullable<T>(validator: Validator<T>): Validator<T | null> {
	return {
		validate(value: unknown): T | null {
			if (value === null) {
				return null;
			}
			return validator.validate(value);
		}
	};
}

// Union type validator
export function union<T extends unknown[]>(...validators: { [K in keyof T]: Validator<T[K]> }): Validator<T[number]> {
	return {
		validate(value: unknown): T[number] {
			for (const validator of validators) {
				try {
					return validator.validate(value);
				} catch {
					// Continue to next validator
				}
			}
			throw new Error(`Value does not match any of the expected types: ${String(value)}`);
		}
	};
}

// Literal value validator
export function literal<T extends string | number | boolean>(expectedValue: T): Validator<T> {
	return createValidator<T>(
		(value) => value === expectedValue,
		`literal value ${String(expectedValue)}`
	);
}

// Record validator
export function record<K extends string, V>(
	valueValidator: Validator<V>
): Validator<Record<K, V>> {
	return {
		validate(value: unknown): Record<K, V> {
			if (typeof value !== 'object' || value === null) {
				throw new Error(`Invalid record: ${String(value)}`);
			}

			const result: Record<string, V> = {};
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) {
					try {
						result[key] = valueValidator.validate((value as Record<string, unknown>)[key]);
					} catch (error) {
						throw new Error(`Invalid value for key ${key}: ${(error as Error).message}`);
					}
				}
			}
			return result as Record<K, V>;
		}
	};
}

// Tuple validator
export function tuple<T extends unknown[]>(...validators: { [K in keyof T]: Validator<T[K]> }): Validator<T> {
	return {
		validate(value: unknown): T {
			if (!Array.isArray(value)) {
				throw new Error(`Invalid tuple: ${String(value)}`);
			}

			if (value.length !== validators.length) {
				throw new Error(`Invalid tuple length: expected ${validators.length}, got ${value.length}`);
			}

			return validators.map((validator, index) => {
				try {
					return validator.validate(value[index]);
				} catch (error) {
					throw new Error(`Invalid tuple item at index ${index}: ${(error as Error).message}`);
				}
			}) as T;
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

// Date validator
export const date = (): Validator<string> => 
	createValidator<string>(
		(value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
		'date in YYYY-MM-DD format'
	);

// Email validator
export const email = createValidator<string>(
	(value) => typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
	'Email'
);

// URL validator
export const url = (): Validator<string> => 
	createValidator<string>(
		(value) => {
			try {
				new URL(value as string);
				return true;
			} catch {
				return false;
			}
		},
		'URL'
	);

// Regex validator
export function regex(pattern: RegExp): Validator<string> {
	return createValidator<string>(
		(value) => typeof value === 'string' && pattern.test(value),
		`string matching pattern ${pattern}`
	);
}

// Custom validator
export function custom<T>(validateFn: (value: unknown) => boolean): Validator<T> {
	return createValidator<T>(validateFn, 'custom validation');
}

// Enumeration validator (renamed from 'enum' since it's a reserved word)
export function enumValues<T extends string | number>(...values: T[]): Validator<T> {
	return createValidator<T>(
		(value) => values.includes(value as T),
		`one of [${values.join(', ')}]`
	);
}
