import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { load, PQ } from './page.js';
import { people } from './parquet.js';

const { S, bufferOf, fieldsOf, readRows, shardAt } = load(
  ['utils', 'state', 'file access', 'schema', 'pages of rows'],
  ['S', 'bufferOf', 'fieldsOf', 'readRows', 'shardAt']
);

describe('the reader inside the page', () => {
  it('offers what tools/build-reader.sh bundles, with every codec it names', () => {
    const script = readFileSync(fileURLToPath(new URL('../../tools/build-reader.sh', import.meta.url)), 'utf8');
    for (const name of Object.keys(PQ)) expect(script).toContain(name);
    expect(Object.keys(PQ.compressors).sort()).toEqual(['BROTLI', 'GZIP', 'LZ4', 'LZ4_RAW', 'ZSTD']);
  });

  it('reads the footer and the rows of a file through bufferOf, as the page does', async () => {
    const file = bufferOf(people([1, 2, 3]));
    const meta = await PQ.parquetMetadataAsync(file);
    expect(Number(meta.num_rows)).toBe(3);
    expect(meta.row_groups).toHaveLength(2);
    const rows = await PQ.parquetReadObjects({ file, metadata: meta, compressors: PQ.compressors, utf8: true });
    expect(rows).toEqual([
      { id: 1, name: 'person 1', score: 0.5 },
      { id: 2, name: 'person 2', score: 1 },
      { id: 3, name: 'person 3', score: 1.5 },
    ]);
  });
});

describe('bufferOf', () => {
  it('gives the length of a file and any range of its bytes, a negative start included', async () => {
    const buffer = bufferOf(new File([new Uint8Array([10, 20, 30, 40, 50])], 'x.bin'));
    expect(buffer.byteLength).toBe(5);
    expect([...new Uint8Array(await buffer.slice(1, 3))]).toEqual([20, 30]);
    expect([...new Uint8Array(await buffer.slice(-2))]).toEqual([40, 50]);
    expect((await buffer.slice(3, 3)).byteLength).toBe(0);
  });
});

describe('rows across shards', () => {
  it('reads a page that starts in one shard and ends in the next', async () => {
    const shards = [people([1, 2, 3], { name: 'a.parquet' }), people([4, 5], { name: 'b.parquet' })];
    S.shards = [];
    S.totalRows = 0;
    for (const file of shards) {
      const buf = bufferOf(file);
      const meta = await PQ.parquetMetadataAsync(buf);
      const rows = Number(meta.num_rows);
      S.shards.push({ file, buf, meta, rows, start: S.totalRows });
      S.totalRows += rows;
    }
    S.fields = fieldsOf(S.shards[0].meta);

    expect(shardAt(0).file.name).toBe('a.parquet');
    expect(shardAt(3).file.name).toBe('b.parquet');
    const page = await readRows(2, 3, ['id', 'name']);
    expect(page).toEqual([
      { id: 3, name: 'person 3' },
      { id: 4, name: 'person 4' },
      { id: 5, name: 'person 5' },
    ]);
  });
});
