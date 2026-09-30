import { describe, it, expect } from 'vitest';
import { load } from './page.js';

const { cellOf, trimFloat, iso, cut, json, jsonPretty, flatText } = load(
  ['utils', 'state', 'values'],
  ['cellOf', 'trimFloat', 'iso', 'cut', 'json', 'jsonPretty', 'flatText']
);

describe('cellOf', () => {
  it('shows null, a boolean, a bigint and a number as they are', () => {
    expect(cellOf(null)).toEqual({ cls: 'nil', html: 'null' });
    expect(cellOf(true)).toEqual({ cls: 'num', html: 'true' });
    expect(cellOf(12345678901234567890n)).toEqual({ cls: 'num', html: '12345678901234567890' });
    expect(cellOf(42)).toEqual({ cls: 'num', html: '42' });
  });

  it('shows a date as ISO 8601, and binary data as its size', () => {
    expect(cellOf(new Date('2026-09-30T12:00:00Z')).html).toBe('2026-09-30 12:00:00Z');
    expect(cellOf(new Uint8Array(2048)).html).toBe('2.0 KiB of binary');
  });

  it('shows a structure as compact JSON, and escapes it', () => {
    expect(cellOf({ a: 1, b: '<x>' }).html).toBe('<span class="js">{&quot;a&quot;:1,&quot;b&quot;:&quot;&lt;x&gt;&quot;}</span>');
  });

  it('puts a text on one line and cuts it at 400 characters', () => {
    expect(cellOf('two\nlines').html).toBe('two lines');
    expect(cellOf('y'.repeat(500)).html).toBe('y'.repeat(400) + '...');
    expect(cellOf('')).toEqual({ cls: 'nil', html: 'empty' });
  });
});

describe('value helpers', () => {
  it('shortens a long float, and keeps a short one', () => {
    expect(trimFloat(0.1 + 0.2)).toBe('0.3');
    expect(trimFloat(1.5)).toBe('1.5');
  });

  it('writes a bigint and binary data into JSON, which JSON.stringify refuses alone', () => {
    expect(json({ n: 5n, b: new Uint8Array(3) })).toBe('{"n":"5","b":"<3 bytes>"}');
    expect(jsonPretty({ n: 5n })).toBe('{\n  "n": "5"\n}');
  });

  it('gives the text of a value for a search', () => {
    expect(flatText(null)).toBe('');
    expect(flatText('text')).toBe('text');
    expect(flatText({ a: 1 })).toBe('{"a":1}');
    expect(flatText(7)).toBe('7');
  });

  it('cuts a text and marks the cut, and reads an invalid date as text', () => {
    expect(cut('abcdef', 3)).toBe('abc...');
    expect(cut('abc', 3)).toBe('abc');
    expect(iso(new Date('not a date'))).toBe('Invalid Date');
  });
});
