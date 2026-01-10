import { useState, useCallback } from 'react';

/**
 * Hook for managing a record of boolean toggle states.
 * Useful for managing visibility of multiple items (e.g., password fields, expandable sections).
 *
 * @example
 * // Toggle visibility of env var values by index
 * const { isActive, toggle } = useToggleState<number>();
 * <button onClick={() => toggle(index)}>{isActive(index) ? 'Hide' : 'Show'}</button>
 *
 * @example
 * // Toggle expanded state of groups by name
 * const { isActive, toggle, setActive } = useToggleState<string>();
 * <button onClick={() => toggle(groupName)}>...</button>
 */
export function useToggleState<K extends string | number>(
    initialState: Record<K, boolean> = {} as Record<K, boolean>
) {
    const [state, setState] = useState<Record<K, boolean>>(initialState);

    const toggle = useCallback((key: K) => {
        setState(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    }, []);

    const setActive = useCallback((key: K, value: boolean) => {
        setState(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const isActive = useCallback((key: K): boolean => {
        return !!state[key];
    }, [state]);

    const reset = useCallback(() => {
        setState({} as Record<K, boolean>);
    }, []);

    return {
        state,
        toggle,
        setActive,
        isActive,
        reset
    };
}
