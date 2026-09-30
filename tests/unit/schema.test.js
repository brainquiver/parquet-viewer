import { describe, it, expect } from 'vitest';
import { load, PQ } from './page.js';
import { parquetFile, people } from './parquet.js';

const { typeName, isText, isNumber, fieldsOf, schemaKey, trimStats, bufferOf } = load(
  ['utils', 'state', 'file access', 'schema'],
  ['typeName', 'isText', 'isNumber', 'fieldsOf', 'schemaKey', 'trimStats', 'bufferOf']
);

const metaOf = file => PQ.parquetMetadataAsync(bufferOf(file));

describe('typeName', () => {
  it('names a column by its logical type first', () => {
    expect(typeName({ type: 'BYTE_ARRAY', logical_type: { type: 'STRING' } })).toBe('string');
    expect(typeName({ type: 'INT64', logical_type: { type: 'TIMESTAMP', unit: 'MILLIS', isAdjustedToUTC: true } })).toBe(
      'timestamp(millis, utc)'
    );
    expect(typeName({ type: 'INT32', logical_type: { type: 'INTEGER', bitWidth: 16, isSigned: false } })).toBe(
      'uint16'
    );
    expect(typeName({ type: 'FIXED_LEN_BYTE_ARRAY', logical_type: { type: 'DECIMAL', precision: 10, scale: 2 } })).toBe(
      'decimal(10,2)'
    );
  });

  it('falls back to the converted type, then to the physical type', () => {
    expect(typeName({ type: 'BYTE_ARRAY', converted_type: 'UTF8' })).toBe('string');
    expect(typeName({ type: 'INT64', converted_type: 'TIMESTAMP_MICROS' })).toBe('timestamp(us)');
    expect(typeName({ type: 'BYTE_ARRAY' })).toBe('binary');
    expect(typeName({ type: 'DOUBLE' })).toBe('double');
    expect(typeName({ type: 'BOOLEAN' })).toBe('bool');
    expect(typeName({})).toBe('group');
  });

  it('tells a text type and a number type apart', () => {
    expect(['string', 'json', 'enum', 'uuid'].every(isText)).toBe(true);
    expect(isText('int32')).toBe(false);
    expect(['int64', 'uint8', 'double', 'decimal(10,2)', 'timestamp(ms)', 'date'].every(isNumber)).toBe(true);
    expect(isNumber('string')).toBe(false);
  });
});

describe('fields of a file', () => {
  it('gives one field for each column, with its type and whether a search reads it', async () => {
    expect(fieldsOf(await metaOf(people([1, 2, 3])))).toEqual([
      { name: 'id', type: 'int32', leaves: [{ path: 'id', name: 'id', type: 'int32' }], repeated: false, optional: true, text: false, number: true },
      { name: 'name', type: 'string', leaves: [{ path: 'name', name: 'name', type: 'string' }], repeated: false, optional: true, text: true, number: false },
      { name: 'score', type: 'double', leaves: [{ path: 'score', name: 'score', type: 'double' }], repeated: false, optional: true, text: false, number: true },
    ]);
  });

  it('gives two shards of one dataset the same schema key, and another schema a different one', async () => {
    const a = await metaOf(people([1, 2]));
    const b = await metaOf(people([3, 4]));
    const other = await metaOf(parquetFile('other.parquet', [{ name: 'id', data: ['x'], type: 'STRING' }]));
    expect(schemaKey(a)).toBe(schemaKey(b));
    expect(schemaKey(other)).not.toBe(schemaKey(a));
  });
});

describe('trimStats', () => {
  it('cuts a long minimum and maximum to 256 characters, and leaves a short one', () => {
    const long = 'x'.repeat(1000);
    const meta = {
      row_groups: [
        { columns: [{ meta_data: { statistics: { min_value: 'a', max_value: long, min: new Uint8Array(300) } } }] },
      ],
    };
    trimStats(meta);
    const st = meta.row_groups[0].columns[0].meta_data.statistics;
    expect(st.min_value).toBe('a');
    expect(st.max_value).toHaveLength(256);
    expect(st.min.byteLength).toBe(256);
  });
});
