import { describe, test, expect, spyOn } from 'bun:test';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

// Adds a toast that goes away on its own and one that stays, in the same millisecond
function addTwoToastsAtOnce(addToast: ReturnType<typeof useToast>['addToast']) {
  const now = spyOn(Date, 'now').mockReturnValue(1790634000000);
  try {
    act(() => {
      addToast('Saved', 'success', 10);
      addToast('Launch started', 'success', Infinity);
    });
  } finally {
    now.mockRestore();
  }
}

// Pages and hooks list addToast in effect deps: a new function would reload them on every toast
describe('ToastProvider', () => {
  test('keeps its callbacks after a toast is added', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    const { addToast, removeToast } = result.current;

    act(() => addToast('Saved', 'success', Infinity));

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.addToast).toBe(addToast);
    expect(result.current.removeToast).toBe(removeToast);
  });

  test('keeps its callbacks after a toast is removed', async () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    const { addToast, removeToast } = result.current;

    act(() => addToast('Saved', 'success', 10));
    await waitFor(() => expect(result.current.toasts).toHaveLength(0));

    expect(result.current.addToast).toBe(addToast);
    expect(result.current.removeToast).toBe(removeToast);
  });

  test('toasts added in the same millisecond get their own ids', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    addTwoToastsAtOnce(result.current.addToast);

    const [saved, started] = result.current.toasts;
    expect(saved.id).not.toBe(started.id);

    act(() => result.current.removeToast(saved.id));
    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Launch started']);
  });

  test('a toast that goes away on its own leaves the other toast', async () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    addTwoToastsAtOnce(result.current.addToast);

    await waitFor(() => expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Launch started']));
  });
});
