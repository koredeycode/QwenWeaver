import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptWithCustomKey, decryptWithCustomKey } from './index.js';

const TEST_KEY = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

describe('encryption', () => {
  it('encrypts and decrypts a string', () => {
    const original = 'sk-ant-api03-secret-key-value-here';
    const encoded = encrypt(original);
    expect(encoded).not.toBe(original);
    expect(encoded.split(':')).toHaveLength(3);

    const decoded = decrypt(encoded);
    expect(decoded).toBe(original);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    const input = 'same-value';
    const a = encrypt(input);
    const b = encrypt(input);
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const encoded = encrypt('');
    const decoded = decrypt(encoded);
    expect(decoded).toBe('');
  });

  it('handles special characters and unicode', () => {
    const input = 'héllo wörld 🎉 with <script>alert(1)</script>';
    const encoded = encrypt(input);
    const decoded = decrypt(encoded);
    expect(decoded).toBe(input);
  });

  it('throws on invalid encoded payload', () => {
    expect(() => decrypt('not-encoded')).toThrow('Invalid encrypted payload');
    expect(() => decrypt('only:two')).toThrow('Invalid encrypted payload');
    expect(() => decrypt('a:b:c:d:e')).toThrow('Invalid encrypted payload');
  });

  it('encrypts and decrypts with a custom key', () => {
    const original = 'custom-key-secret';
    const customKey = '1122334455667788112233445566778811223344556677881122334455667788';
    const encoded = encryptWithCustomKey(original, customKey);
    expect(encoded).not.toBe(original);

    const decoded = decryptWithCustomKey(encoded, customKey);
    expect(decoded).toBe(original);
  });

  it('produces different ciphertext with different custom keys', () => {
    const input = 'test-value';
    const keyA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const keyB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const encA = encryptWithCustomKey(input, keyA);
    const encB = encryptWithCustomKey(input, keyB);
    expect(encA).not.toBe(encB);
  });

  it('fails to decrypt with wrong custom key', () => {
    const original = 'secret-data';
    const goodKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const badKey = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const encoded = encryptWithCustomKey(original, goodKey);
    expect(() => decryptWithCustomKey(encoded, badKey)).toThrow();
  });

  it('round-trips long strings', () => {
    const input = 'x'.repeat(10000);
    const encoded = encrypt(input);
    const decoded = decrypt(encoded);
    expect(decoded).toBe(input);
  });
});
