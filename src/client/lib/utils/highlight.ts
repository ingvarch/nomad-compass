import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import ini from 'highlight.js/lib/languages/ini';
import json from 'highlight.js/lib/languages/json';
import nginx from 'highlight.js/lib/languages/nginx';
import properties from 'highlight.js/lib/languages/properties';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// Only the languages of languagesForFile, so the bundle stays small
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('json', json);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('properties', properties);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

/**
 * HTML with the tokens marked by hljs-* classes, in the one language or in the candidate that fits
 * the code best. The code is escaped, so the result is safe to render.
 */
export function highlightCode(code: string, languages: string[]): string {
  if (languages.length === 1) {
    return hljs.highlight(code, { language: languages[0], ignoreIllegals: true }).value;
  }
  return hljs.highlightAuto(code, languages).value;
}
