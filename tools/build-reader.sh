#!/bin/sh
# Build the Parquet reader that parquet-viewer.html carries.
#
# The page is one file and opens from the disk, so it cannot fetch
# anything when it runs. The reader is therefore bundled into it.
# This script fetches hyparquet, fzstd and hyparquet-compressors, bundles
# them as one classic script that sets window.PQ, and prints its path.
# Paste the bundle between the <script> tags after the license notice.
#
#   sh tools/build-reader.sh
#
# SNAPPY is left to hyparquet's own decoder. The alternative, hysnappy, is
# WebAssembly, and the page must stay one file that works offline.
set -e

OUT="${1:-$(mktemp -d)}"
cd "$OUT"

npm pack hyparquet@1.28.1 fzstd@0.1.1 hyparquet-compressors@1.1.1 >/dev/null
for t in *.tgz; do
  case "$t" in
    hyparquet-compressors-*) d=hycomp ;;
    hyparquet-*) d=hyparquet ;;
    fzstd-*) d=fzstd ;;
  esac
  tar xzf "$t"
  rm -rf "$d"
  mv package "$d"
done

mkdir -p node_modules
ln -sf ../fzstd node_modules/fzstd

cat > entry.mjs <<'JS'
/* The reader, as one script. SNAPPY is left to hyparquet's own decoder, so
   nothing here needs WebAssembly and the page stays one file. */
import { parquetMetadataAsync, parquetReadObjects, parquetSchema, toJson } from './hyparquet/src/index.js';
import { decompress as decompressZstd } from './fzstd/esm/index.mjs';
import { decompressBrotli } from './hycomp/src/brotli.js';
import { gunzip } from './hycomp/src/gzip.js';
import { decompressLz4, decompressLz4Raw } from './hycomp/src/lz4.js';

const compressors = {
  ZSTD: function (input, outputLength) {
    return decompressZstd(input, outputLength ? new Uint8Array(outputLength) : undefined);
  },
  GZIP: function (input, outputLength) { return gunzip(input, new Uint8Array(outputLength)); },
  BROTLI: decompressBrotli,
  LZ4: decompressLz4,
  LZ4_RAW: decompressLz4Raw
};

window.PQ = { parquetMetadataAsync: parquetMetadataAsync, parquetReadObjects: parquetReadObjects,
              parquetSchema: parquetSchema, toJson: toJson, compressors: compressors };
JS

npx --yes esbuild@0.25.0 entry.mjs --bundle --format=iife --minify --target=es2020 --outfile=pqbundle.js

echo "The reader is at $OUT/pqbundle.js"
wc -c pqbundle.js
