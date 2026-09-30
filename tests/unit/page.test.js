import { describe, it, expect } from 'vitest';
import { html, sectionNames } from './page.js';

describe('parquet-viewer.html', () => {
  it('holds every section that the unit tests load', () => {
    for (const name of ['utils', 'state', 'file access', 'schema', 'pages of rows', 'values', 'right panel', 'search']) {
      expect(sectionNames).toContain(name);
    }
  });

  it('runs from the disk: it loads no script from another file', () => {
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
  });

  it('asks the network for nothing but fonts', () => {
    const hosts = [...html.matchAll(/(?:src|href)="(https?:\/\/[^/"]+)/g)].map(match => match[1]);
    expect(hosts.every(host => /^https:\/\/fonts\.(googleapis|gstatic)\.com$/.test(host))).toBe(true);
  });
});
