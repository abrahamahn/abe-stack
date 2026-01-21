// apps/web/src/features/auth/utils/__tests__/createFormHandler.test.ts
import {
  createFormHandler as uiCreateFormHandler,
  type FormHandlerOptions as UIFormHandlerOptions,
} from '@abe-stack/ui';
import { describe, expect, it } from 'vitest';

import { createFormHandler } from '../createFormHandler';

import type { FormHandlerOptions } from '../createFormHandler';

describe('createFormHandler', () => {
  it('is a re-export of createFormHandler from @abe-stack/ui', () => {
    expect(createFormHandler).toBe(uiCreateFormHandler);
  });

  it('has the expected function signature', () => {
    expect(typeof createFormHandler).toBe('function');
  });
});

describe('FormHandlerOptions type', () => {
  it('is compatible with FormHandlerOptions from @abe-stack/ui', () => {
    // Type-level test: types should be compatible
    const options: UIFormHandlerOptions = {
      onStart: () => undefined,
      onSuccess: () => undefined,
      onError: (_error: Error) => undefined,
      onFinally: () => undefined,
    };

    // This assignment should compile without error
    const localOptions: FormHandlerOptions = options;
    const backToUI: UIFormHandlerOptions = localOptions;

    expect(localOptions).toEqual(options);
    expect(backToUI).toEqual(localOptions);
  });
});
