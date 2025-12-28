export type TokenStore = {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
};

const createMemoryTokenStore = (): TokenStore => {
  let token: string | null = null;
  return {
    get: (): string | null => token,
    set: (value: string): void => {
      token = value;
    },
    clear: (): void => {
      token = null;
    },
  };
};

const hasLocalStorage = (): boolean =>
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

const createLocalStorageTokenStore = (): TokenStore => ({
  get: (): string | null => (hasLocalStorage() ? globalThis.localStorage.getItem('token') : null),
  set: (value: string): void => {
    if (hasLocalStorage()) {
      globalThis.localStorage.setItem('token', value);
    }
  },
  clear: (): void => {
    if (hasLocalStorage()) {
      globalThis.localStorage.removeItem('token');
    }
  },
});

export const tokenStore: TokenStore = hasLocalStorage()
  ? createLocalStorageTokenStore()
  : createMemoryTokenStore();

export const createTokenStore = {
  memory: createMemoryTokenStore,
  localStorage: createLocalStorageTokenStore,
};
