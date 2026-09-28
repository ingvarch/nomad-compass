import { describe, test, expect } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetch } from './useFetch';

// Loads job "a", whose reply is held back, then job "b", whose reply comes at once
function renderSlowThenFast(slowReply: Promise<string>) {
  const { result, rerender } = renderHook(
    ({ id }) => useFetch(() => (id === 'a' ? slowReply : Promise.resolve('b')), [id]),
    { initialProps: { id: 'a' } }
  );
  rerender({ id: 'b' });
  return result;
}

function settle() {
  return act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

describe('useFetch', () => {
  test('keeps the data of the latest call when an earlier call answers later', async () => {
    const slow = Promise.withResolvers<string>();
    const result = renderSlowThenFast(slow.promise);
    await waitFor(() => expect(result.current.data).toBe('b'));

    slow.resolve('a');
    await settle();

    expect(result.current.data).toBe('b');
    expect(result.current.loading).toBe(false);
  });

  test('ignores the error of an earlier call that fails later', async () => {
    const slow = Promise.withResolvers<string>();
    const result = renderSlowThenFast(slow.promise);
    await waitFor(() => expect(result.current.data).toBe('b'));

    slow.reject(new Error('Job "a" not found'));
    await settle();

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('b');
  });
});
