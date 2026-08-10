#!/usr/bin/env python3
"""Build a test page for the viewer, with a dataset inside it.

A browser cannot be driven through a file dialog, so a test cannot choose a
folder. This script writes a copy of the page with the bytes of one or more
Parquet files embedded in it. The copy builds real File objects from those
bytes on load and passes them to the picker, which is the same path that a
chosen folder takes. The viewer runs unchanged, without a stub.

    python3 tools/build-test-page.py small.parquet other.parquet
    python3 tools/build-test-page.py shards/

The result is _test-page.html beside the page, which git ignores. The sample
must stay small, because the bytes are held as base64 and the test page is
about a third larger than the files it carries.
"""

import base64
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGE = HERE.parent / "parquet-viewer.html"
OUT = HERE.parent / "_test-page.html"

TAIL = """
<script>
/* A test page. The bytes below become real File objects, and the picker
   takes them the way it takes a folder that a person chose. */
window.__testFiles = [%s];
window.addEventListener("load", function () {
  setTimeout(function () {
    var files = window.__testFiles.map(function (e) {
      var bin = atob(e.b), u = new Uint8Array(bin.length), i;
      for (i = 0; i < bin.length; i++) { u[i] = bin.charCodeAt(i); }
      var f = new File([u], e.p.split("/").pop(), { type: "application/octet-stream" });
      Object.defineProperty(f, "webkitRelativePath", { value: e.p });
      return f;
    });
    var input = document.getElementById("pickDir");
    Object.defineProperty(input, "files", { value: files, configurable: true });
    window.__t0 = performance.now();
    input.dispatchEvent(new Event("change"));
  }, 300);
});
</script>
"""


def collect(args):
    """Every Parquet file that the arguments name, with its display path."""
    out = []
    for arg in args:
        p = Path(arg)
        if p.is_dir():
            for f in sorted(p.iterdir()):
                if f.suffix.lower() in (".parquet", ".pq"):
                    out.append((p.name + "/" + f.name, f))
        elif p.is_file():
            out.append((p.parent.name + "/" + p.name, p))
        else:
            print("no such path: " + arg)
    return out


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    files = collect(argv[1:])
    if not files:
        print("Nothing to embed.")
        return 1

    total = sum(f.stat().st_size for _, f in files)
    if total > 40 * 1024 * 1024:
        print("That is %.1f MB of data. Use a smaller sample." % (total / 1e6))
        return 1

    blocks = []
    for rel, f in files:
        blocks.append('{p:%s,b:"%s"}' % (json.dumps(rel), base64.b64encode(f.read_bytes()).decode("ascii")))
        print("embedded %-52s %9d bytes" % (rel, f.stat().st_size))

    page = PAGE.read_text(encoding="utf-8")
    OUT.write_text(page.replace("</body>", TAIL % ",".join(blocks) + "</body>"), encoding="utf-8")
    print("wrote %s, %.1f MB" % (OUT.name, OUT.stat().st_size / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
