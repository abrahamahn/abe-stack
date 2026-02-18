// main/server/system/src/storage/providers/presigner.test.ts
import { describe, expect, it } from 'vitest';

import { createSignature, verifySignature } from './presigner';

describe('storage/providers/presigner', () => {
  it('creates stable signatures regardless of object key order', () => {
    const key = Buffer.from('secret');
    const a = createSignature({ data: { b: 2, a: 1 }, secretKey: key });
    const b = createSignature({ data: { a: 1, b: 2 }, secretKey: key });
    expect(a).toBe(b);
  });

  it('verifies signatures', () => {
    const key = Buffer.from('secret');
    const data = { a: 1, b: 'two' };
    const sig = createSignature({ data, secretKey: key });
    expect(verifySignature({ data, signature: sig, secretKey: key })).toBe(true);
    expect(verifySignature({ data, signature: sig, secretKey: Buffer.from('wrong') })).toBe(false);
  });
});
