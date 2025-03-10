export type Simplify<T> = { [K in keyof T]: T[K] }

export type Assert<_A extends _B, _B> = {}
