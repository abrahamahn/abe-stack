// core/src/infrastructure/http/cookie.test.ts
import { describe, expect, it } from 'vitest';

import { parseCookies } from './cookie';

describe('parseCookies', () => {
  it('should parse simple cookie', () => {
    const result = parseCookies('name=value');
    expect(result).toEqual({ name: 'value' });
  });

  it('should parse multiple cookies', () => {
    const result = parseCookies('name=value; session=abc123; token=xyz');
    expect(result).toEqual({
      name: 'value',
      session: 'abc123',
      token: 'xyz',
    });
  });

  it('should handle spaces around values', () => {
    const result = parseCookies('name = value ; session = abc123');
    expect(result).toEqual({
      name: 'value',
      session: 'abc123',
    });
  });

  it('should decode URI encoded values', () => {
    const result = parseCookies('name=hello%20world; email=test%40example.com');
    expect(result).toEqual({
      name: 'hello world',
      email: 'test@example.com',
    });
  });

  it('should handle quoted values', () => {
    const result = parseCookies('name="quoted value"');
    expect(result).toEqual({
      name: 'quoted value',
    });
  });

  it('should handle empty string', () => {
    const result = parseCookies('');
    expect(result).toEqual({});
  });

  it('should handle null', () => {
    const result = parseCookies(null);
    expect(result).toEqual({});
  });

  it('should handle undefined', () => {
    const result = parseCookies(undefined);
    expect(result).toEqual({});
  });

  it('should skip invalid pairs without equals', () => {
    const result = parseCookies('valid=value; invalid; another=test');
    expect(result).toEqual({
      valid: 'value',
      another: 'test',
    });
  });

  it('should handle values with equals sign', () => {
    const result = parseCookies('token=abc=def=ghi');
    expect(result).toEqual({
      token: 'abc=def=ghi',
    });
  });

  it('should handle empty value', () => {
    const result = parseCookies('empty=');
    expect(result).toEqual({
      empty: '',
    });
  });

  it('should handle malformed URI encoding gracefully', () => {
    const result = parseCookies('name=%invalid%');
    expect(result).toEqual({
      name: '%invalid%',
    });
  });

  it('should handle cookies with special characters', () => {
    const result = parseCookies('data={"key":"value"}');
    expect(result).toEqual({
      data: '{"key":"value"}',
    });
  });
});
