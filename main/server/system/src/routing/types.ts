// main/server/system/src/routing/types.ts
/**
 * Routing primitive types.
 *
 * Kept in a dedicated file so `route.registry` and `routing` can both import
 * from here without creating a mutual dependency between each other.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
