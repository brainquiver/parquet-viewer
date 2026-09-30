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
edited:
  by: claude-code/opus-5.5
  at: 2026-09-30T20:35:50Z
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
| `tests/unit/` | the unit tests of the page and of the test page script |
| `.github/` | the tests workflow and the Dependabot settings |

**Everything the page needs, including the Parquet reader and Carbon, is inside the one HTML file.**

## 1. Build and Run

    open parquet-viewer.html                              # or open the file in any browser
    python3 tools/build-test-page.py small.parquet        # writes _test-page.html beside the page
    sh tools/build-reader.sh                              # rebuild the Parquet reader
    npm ci                                                # the test packages, from package-lock.json
    npm test                                              # the unit tests

The viewer itself is just the page. `tools/build-test-page.py` needs Python 3, and `tools/build-reader.sh` needs `npm` and a network connection. The script prints the path of the new reader bundle, which replaces the code between the `<script>` tags after the licence notice in the page. The tests need Node.js 22.12 or later, and Python 3 for the test of `tools/build-test-page.py`.

### 1.1 Tests

The 38 unit tests run without a browser in Node with Vitest:

| Test file | What it checks |
| --- | --- |
| `format.test.js` | how counts, sizes and durations are written, and how text is escaped |
| `schema.test.js` | the type name of each column, the fields of a file, the schema key that matches shards, and the cut of long statistics |
| `values.test.js` | how each kind of value shows in a table cell, and the text of a value for a search |
| `search.test.js` | the three kinds of query, the column tests, the row groups that the statistics let a search skip, and the snippet of a match |
| `reader.test.js` | the Parquet reader inside the page, the byte ranges of a file, and a page of rows that spans two shards |
| `page.test.js` | that the page loads no script from other files, and asks the network for fonts alone |
| `build-test-page.test.js` | that `tools/build-test-page.py` puts a file inside a copy of the page, and stops when it has nothing to embed |

The page does not have any dependencies. `tests/unit/page.js` cuts the script at its section banners, such as `/* ---- schema */`, and runs the exact code of the page. It also runs the Parquet reader that the page carries. The Parquet files of the tests are written in memory by hyparquet-writer.

GitHub Actions runs `npm test` on Node.js 22 and 24 for every pull request and every push to `main`. Pull requests from Dependabot run on GitHub's own runners. Pushes and PRs to main use Blacksmith. Once a month, Dependabot proposes updates to Vitest, to hyparquet-writer and to the pinned actions, to be merged manually.

## 2. Directory Tree

    icons/          the favicon and the vector marks
    tools/          the reader build script and the test page script
    tests/unit/     the unit tests, the loader of the page sections, and the test files
    .github/        the tests workflow and the Dependabot settings

## 3. Rules

**Keep the banner comment of each section in the app script.** The unit tests load the logic of the page by its section banners, so a renamed or removed banner fails the tests that load it.
