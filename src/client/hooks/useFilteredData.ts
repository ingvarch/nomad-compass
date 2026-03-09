import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterOption } from '../components/ui';

interface FilterConfig<T, F extends string> {
  /** URL parameter name for the filter (default: 'status') */
  paramName?: string;
  /** Default filter value when none specified */
  defaultValue: F;
  /** Filter definitions with predicate and display info */
  filters: {
    value: F;
    label: string;
    predicate: (item: T) => boolean;
    color?: string;
  }[];
}

interface UseFilteredDataResult<T, F extends string> {
  /** Currently active filter value */
  activeFilter: F;
  /** Items filtered by current filter */
  filteredItems: T[];
  /** Filter options with counts for FilterButtons */
  filterOptions: FilterOption[];
  /** Function to set the active filter (accepts string for FilterButtons compatibility) */
  setFilter: (filter: string) => void;
  /** Stats object with count per filter */
  stats: Record<F, number>;
}

/**
 * Hook for managing filtered data with URL params and stats
 */
export function useFilteredData<T, F extends string>(
  items: T[],
  config: FilterConfig<T, F>
): UseFilteredDataResult<T, F> {
  const [searchParams, setSearchParams] = useSearchParams();
  const { paramName = 'status', defaultValue, filters } = config;

  // Get current filter from URL
  const activeFilter = (searchParams.get(paramName) as F) || defaultValue;

  // Calculate stats for each filter
  const stats = useMemo(() => {
    const result = {} as Record<F, number>;
    for (const filter of filters) {
      if (filter.value === defaultValue) {
        // "All" filter shows total count
        result[filter.value] = items.length;
      } else {
        result[filter.value] = items.filter(filter.predicate).length;
      }
    }
    return result;
  }, [items, filters, defaultValue]);

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    const filterDef = filters.find((f) => f.value === activeFilter);
    if (!filterDef || activeFilter === defaultValue) {
      return items;
    }
    return items.filter(filterDef.predicate);
  }, [items, activeFilter, filters, defaultValue]);

  // Generate filter options for FilterButtons component
  const filterOptions: FilterOption[] = useMemo(
    () =>
      filters.map((f) => ({
        value: f.value,
        label: f.label,
        count: stats[f.value],
        color: f.color,
      })),
    [filters, stats]
  );

  // Set filter and update URL
  const setFilter = useCallback(
    (filter: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (filter === defaultValue) {
        newParams.delete(paramName);
      } else {
        newParams.set(paramName, filter);
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, paramName, defaultValue]
  );

  return {
    activeFilter,
    filteredItems,
    filterOptions,
    setFilter,
    stats,
  };
}
