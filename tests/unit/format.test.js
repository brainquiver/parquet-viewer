import { describe, it, expect } from 'vitest';
import { load } from './page.js';

const { num, bytes, secs, esc, clamp } = load(['utils'], ['num', 'bytes', 'secs', 'esc', 'clamp']);

describe('format', () => {
  it('groups the digits of a count in threes, for a bigint and a negative number too', () => {
    expect(num(0)).toBe('0');
    expect(num(1234567)).toBe('1,234,567');
    expect(num(-1234)).toBe('-1,234');
    expect(num(12345678901234567890n)).toBe('12,345,678,901,234,567,890');
    expect(num(999.6)).toBe('1,000');
  });

  it('gives a size in binary units, with one decimal below ten', () => {
    expect(bytes(512)).toBe('512 B');
    expect(bytes(2048)).toBe('2.0 KiB');
    expect(bytes(15 * 1024 * 1024)).toBe('15 MiB');
    expect(bytes(3 * 1024 ** 4)).toBe('3.0 TiB');
  });

  it('gives a duration in milliseconds, seconds, or minutes and seconds', () => {
    expect(secs(250)).toBe('250 ms');
    expect(secs(4200)).toBe('4.2 s');
    expect(secs(125000)).toBe('2 min 5 s');
  });

  it('escapes the characters that would break the markup', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(esc(null)).toBe('');
  });

  it('holds a value between two limits', () => {
    expect([clamp(-1, 0, 10), clamp(5, 0, 10), clamp(11, 0, 10)]).toEqual([0, 5, 10]);
  });
});
