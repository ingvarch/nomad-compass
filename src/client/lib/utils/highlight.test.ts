import { describe, test, expect } from 'bun:test';
import { highlightCode } from './highlight';

const nginxConf = 'upstream api {\n  server 127.0.0.1:31220;\n}\n\nserver {\n  listen 80;\n  location /api/ {\n    proxy_pass http://api/;\n  }\n}\n';
const iniConf = '[program:web]\ncommand=/usr/bin/web\nautostart=true\n';

describe('highlightCode', () => {
  test('marks the tokens of a known language', () => {
    const html = highlightCode('{"listen": ":8080", "debug": false}', ['json']);

    expect(html).toContain('<span class="hljs-attr">&quot;listen&quot;</span>');
    expect(html).toContain('<span class="hljs-literal"><span class="hljs-keyword">false</span></span>');
  });

  test.each(['json', 'yaml', 'nginx', 'ini', 'bash', 'xml', 'properties'])('knows %s', (language) => {
    expect(() => highlightCode('a = 1', [language])).not.toThrow();
  });

  test('picks the candidate that fits the content', () => {
    expect(highlightCode(nginxConf, ['nginx', 'ini'])).toContain('<span class="hljs-attribute">listen</span>');
    expect(highlightCode(iniConf, ['nginx', 'ini'])).toContain('<span class="hljs-section">[program:web]</span>');
  });

  // The page renders the result as HTML
  test('escapes the markup of the file', () => {
    const html = highlightCode('<script>alert(1)</script>', ['xml']);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
  });
});
