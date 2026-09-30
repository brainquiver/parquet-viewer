---
type: Repository Guide
title: Parquet Viewer
description: An offline single page viewer for Parquet files and folders of shards.
status: stable
tags: [data, parquet, browser]
generated:
  by: claude-code/opus-5.5
  at: 2026-09-29T16:55:00Z
supervised:
  by: human:ciprian-florin_ifrim
  at: 2026-09-29T16:55:00Z
---

# Parquet Viewer

`parquet-viewer.html` is a single HTML page that opens a Parquet file, or a whole folder of shards as one dataset. It runs straight from the disk in any modern browser, and the files stay in that browser tab.

It reads the footer of each file first, which holds the schema, the row count and the statistics of every column. A folder of 435 shards opens in under a second, and rows load one page at a time.

| File | Description |
|---|---|
| `parquet-viewer.html` | the viewer, with the Parquet reader and the Carbon Design System inside it |
| `tools/build-reader.sh` | rebuilds the Parquet reader that the page carries |
| `tools/build-test-page.py` | writes a test page with sample Parquet files built in |
| `icons/` | the favicon and the vector marks |

**Everything the page needs, including the Parquet reader and Carbon, is inside the one HTML file.**

## 1. Build and Run

    open parquet-viewer.html                              # or open the file in any browser
    python3 tools/build-test-page.py small.parquet        # writes _test-page.html beside the page
    sh tools/build-reader.sh                              # rebuild the Parquet reader

The viewer itself is just the page. `tools/build-test-page.py` needs Python 3, and `tools/build-reader.sh` needs `npm` and a network connection. The script prints the path of the new reader bundle, which replaces the code between the `<script>` tags after the licence notice in the page.

## 2. Directory Tree

    icons/     the favicon and the vector marks
    tools/     the reader build script and the test page script
