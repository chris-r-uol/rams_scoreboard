/**
 * Team badges.
 *
 * The http rejection is the case worth guarding: the app is served over https,
 * so an http image is blocked as mixed content and simply never appears. Failing
 * loudly at the point of entry beats a badge that silently never renders on air.
 */
import { describe, it, expect } from 'vitest';
import { validateBadgeUrl, byteLength, formatBytes } from './logo.js';

describe('validateBadgeUrl', () => {
  it('accepts an https image link', () => {
    expect(validateBadgeUrl('https://example.com/badge.png'))
      .toBe('https://example.com/badge.png');
  });

  it('trims surrounding whitespace from a pasted link', () => {
    expect(validateBadgeUrl('  https://example.com/b.png  '))
      .toBe('https://example.com/b.png');
  });

  it('rejects http, explaining why rather than failing silently later', () => {
    expect(() => validateBadgeUrl('http://example.com/badge.png'))
      .toThrow(/https/i);
  });

  it('rejects other schemes', () => {
    expect(() => validateBadgeUrl('ftp://example.com/b.png')).toThrow(/https/i);
    expect(() => validateBadgeUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects nonsense', () => {
    expect(() => validateBadgeUrl('not a url')).toThrow(/URL/i);
  });

  it('rejects an empty box with a useful message', () => {
    expect(() => validateBadgeUrl('')).toThrow(/paste/i);
    expect(() => validateBadgeUrl(null)).toThrow(/paste/i);
  });
});

describe('byteLength', () => {
  it('measures the encoded payload of a data URL, not the string', () => {
    // "AAAA" in base64 decodes to 3 bytes.
    expect(byteLength('data:image/webp;base64,AAAA')).toBe(3);
  });

  it('falls back to string length when there is no comma', () => {
    expect(byteLength('abcd')).toBe(4);
  });

  it('scales roughly three quarters of the base64 length', () => {
    const body = 'A'.repeat(4000);
    expect(byteLength(`data:image/webp;base64,${body}`)).toBe(3000);
  });
});

describe('formatBytes', () => {
  it('shows small badges in bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('shows larger badges in KB, so the broadcast cost is legible', () => {
    expect(formatBytes(2949)).toBe('2.9 KB');
  });
});
