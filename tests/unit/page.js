// Loads the logic of parquet-viewer.html for a test, without a browser and without a change to
// the page. The page is one file on purpose, so its scripts export nothing. The Parquet reader is
// a classic script that sets window.PQ, and it runs here with a plain object for window. The app
// script is cut into sections by banner comments, as "/* ---- schema */". This runs the sections
// that a test names together, with the reader as PQ, and returns the functions that it names.
// The code under test is therefore the code in the page, byte for byte.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PAGE = fileURLToPath(new URL('../../parquet-viewer.html', import.meta.url));

export const html = readFileSync(PAGE, 'utf8');

const scripts = [...html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)].map(
  match => match[1]
);

// The reader is the one script that sets window.PQ. The app is the last module script.
const readerSource = scripts.find(source => /window\.PQ\s*=/.test(source));
if (!readerSource) throw new Error('parquet-viewer.html has no script that sets window.PQ');
const app = scripts.at(-1);

const window = {};
new Function('window', readerSource)(window);
export const PQ = window.PQ;

const marks = [...app.matchAll(/^ {2}\/\* -+ ([a-zA-Z ]+?) \*\/$/gm)].map(match => ({
  name: match[1],
  at: match.index,
}));

export const sectionNames = marks.map(mark => mark.name);

function section(name) {
  const index = marks.findIndex(mark => mark.name === name);
  if (index < 0) throw new Error(`parquet-viewer.html has no section "${name}"`);
  return app.slice(marks[index].at, marks[index + 1]?.at ?? app.length);
}

/** Run the named sections of the app script together, and return the named functions. */
export function load(sections, functions) {
  const source = sections.map(section).join('\n');
  return new Function('PQ', `${source}\nreturn { ${functions.join(', ')} };`)(PQ);
}
