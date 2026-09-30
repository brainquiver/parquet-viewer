import { describe, it, expect, beforeAll } from 'vitest';
import { load, PQ } from './page.js';
import { people } from './parquet.js';

const { S, bufferOf, fieldsOf, parseQuery, testPred, canSkip, snippet } = load(
  ['utils', 'state', 'file access', 'schema', 'values', 'right panel', 'search'],
  ['S', 'bufferOf', 'fieldsOf', 'parseQuery', 'testPred', 'canSkip', 'snippet']
);

// Six people in row groups of two: ids 1 and 2, 3 and 4, 5 and 6.
let groups;
beforeAll(async () => {
  const meta = await PQ.parquetMetadataAsync(bufferOf(people([1, 2, 3, 4, 5, 6])));
  S.fields = fieldsOf(meta);
  groups = meta.row_groups;
});

describe('parseQuery', () => {
  it('reads plain text as a search for that text, with its special characters escaped', () => {
    const q = parseQuery('a.b (c)');
    expect(q.kind).toBe('text');
    expect(q.re.test('find A.B (C) here')).toBe(true);
    expect(q.re.test('aXb (c)')).toBe(false);
  });

  it('reads a pattern between slashes as a regular expression, and reports a bad one', () => {
    expect(parseQuery('/^person \\d$/').re.test('Person 7')).toBe(true);
    expect(parseQuery('/(/')).toMatchObject({ kind: 'bad' });
    expect(parseQuery('/(/').why).toMatch(/^That is not a regular expression/);
  });

  it('reads a column, an operator and a value as a test, with the number of a number column', () => {
    expect(parseQuery('id >= 3')).toMatchObject({ kind: 'pred', op: '>=', value: 3 });
    expect(parseQuery('name = "person 2"')).toMatchObject({ kind: 'pred', op: '=', value: 'person 2' });
    expect(parseQuery('score != null')).toMatchObject({ kind: 'pred', op: '!=', value: null });
  });

  it('names a column that does not exist, and reads nothing from an empty box', () => {
    expect(parseQuery('age > 3')).toEqual({ kind: 'bad', why: 'There is no column called age.' });
    expect(parseQuery('   ')).toBeNull();
  });
});

describe('testPred', () => {
  const q = text => parseQuery(text);

  it('compares a number, a bigint included', () => {
    expect(testPred(q('id > 3'), 4)).toBe(true);
    expect(testPred(q('id > 3'), 3)).toBe(false);
    expect(testPred(q('id <= 3'), 3n)).toBe(true);
    expect(testPred(q('id > 3'), null)).toBe(false);
  });

  it('tests equality as text as well, and finds a part of a value with ~', () => {
    expect(testPred(q('id = 3'), '3')).toBe(true);
    expect(testPred(q('id != 3'), 4)).toBe(true);
    expect(testPred(q('name ~ SON 2'), 'person 2')).toBe(true);
  });
});

describe('canSkip', () => {
  it('skips a row group whose statistics exclude every match', () => {
    const skipped = text => groups.map(group => canSkip(parseQuery(text), group));
    expect(skipped('id > 4')).toEqual([true, true, false]);
    expect(skipped('id < 3')).toEqual([false, true, true]);
    expect(skipped('id = 4')).toEqual([true, false, true]);
    expect(skipped('id >= 2')).toEqual([false, false, false]);
  });

  it('never skips for a text search, a !=, or a ~', () => {
    expect(groups.some(group => canSkip(parseQuery('person'), group))).toBe(false);
    expect(groups.some(group => canSkip(parseQuery('id != 1'), group))).toBe(false);
    expect(groups.some(group => canSkip(parseQuery('name ~ x'), group))).toBe(false);
  });
});

describe('snippet', () => {
  it('marks the match and keeps 70 characters on each side', () => {
    const text = 'a'.repeat(100) + 'needle' + 'b'.repeat(100);
    const out = snippet(text, /needle/);
    expect(out).toBe('...' + 'a'.repeat(70) + '<mark>needle</mark>' + 'b'.repeat(70) + '...');
  });

  it('escapes the text and falls back to the start when nothing matches', () => {
    expect(snippet('<b>bold</b>', /bold/)).toBe('&lt;b&gt;<mark>bold</mark>&lt;/b&gt;');
    expect(snippet('no match here', /zzz/)).toBe('no match here');
  });
});
