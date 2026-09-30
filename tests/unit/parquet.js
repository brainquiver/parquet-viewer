// Small Parquet files for the tests, written in memory by hyparquet-writer. Each one becomes a
// real File, which is what the page receives from the folder picker.
import { parquetWriteBuffer } from 'hyparquet-writer';

/** A Parquet file with the given columns, and a row group for every rowGroupSize rows. */
export function parquetFile(name, columnData, { rowGroupSize = 1000, path = name } = {}) {
  const file = new File([parquetWriteBuffer({ columnData, rowGroupSize })], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

/** A file of people: an id, a name and a score, in row groups of two. */
export function people(ids, { name = 'people.parquet' } = {}) {
  return parquetFile(
    name,
    [
      { name: 'id', data: new Int32Array(ids), type: 'INT32' },
      { name: 'name', data: ids.map(id => `person ${id}`), type: 'STRING' },
      { name: 'score', data: new Float64Array(ids.map(id => id / 2)), type: 'DOUBLE' },
    ],
    { rowGroupSize: 2 }
  );
}
