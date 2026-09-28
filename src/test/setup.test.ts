import { describe, test, expect } from 'bun:test';
import { createElement } from 'react';
import { render } from '@testing-library/react';

describe('test setup', () => {
  test('an AbortController signal works with the native Request', () => {
    expect(() => new Request('http://x', { signal: new AbortController().signal })).not.toThrow();
  });

  test('marks the environment as a React act environment', () => {
    expect((globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT).toBe(true);
  });

  // The next test checks that this render was cleaned up.
  test('renders into the document', () => {
    render(createElement('p', null, 'left over'));
    expect(document.body.textContent).toBe('left over');
  });

  test('empties the document between tests', () => {
    expect(document.body.innerHTML).toBe('');
  });
});
