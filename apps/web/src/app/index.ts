// apps/web/src/app/index.ts
export { App } from './root';
export { AppProvider, ClientEnvironmentProvider, environment, useClientEnvironment } from './ClientEnvironment';
export type { ClientEnvironment } from './ClientEnvironment';
export { createClientEnvironment, getClientEnvironment, resetClientEnvironment } from './createEnvironment';
export type { ClientConfig } from '@config';
