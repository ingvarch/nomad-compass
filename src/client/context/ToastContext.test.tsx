import { describe, test, expect } from 'bun:test';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
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
});
