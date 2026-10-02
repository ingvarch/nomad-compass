import { describe, test, expect } from 'bun:test';
import {
  inputAclStyles,
  inputErrorStyles,
  inputFlexStyles,
  inputMonoStyles,
  inputMonokaiErrorStyles,
  inputMonokaiFlexStyles,
  inputMonokaiStyles,
  inputStyles,
} from './styles';

// Without its own color a placeholder is half the text color: in the dark theme it reads like a typed value
describe('text input styles', () => {
  test.each([
    ['inputStyles', inputStyles],
    ['inputFlexStyles', inputFlexStyles],
    ['inputMonoStyles', inputMonoStyles],
    ['inputErrorStyles', inputErrorStyles],
    ['inputAclStyles', inputAclStyles],
    ['inputMonokaiStyles', inputMonokaiStyles],
    ['inputMonokaiFlexStyles', inputMonokaiFlexStyles],
    ['inputMonokaiErrorStyles', inputMonokaiErrorStyles],
  ])('%s gives the placeholder a muted color in both themes', (_, styles) => {
    const classes = styles.split(/\s+/);

    expect(classes).toContain('placeholder-gray-400');
    expect(classes.some((c) => c.startsWith('dark:placeholder-'))).toBe(true);
  });
});
