import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export const useSortableData = <T>(items: T[], config: SortConfig<T> | null = null) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getVal = (obj: any, path: string | keyof T) => {
            if (typeof path !== 'string') return obj[path];
            return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
        };

        const aValue = getVal(a, sortConfig.key);
        const bValue = getVal(b, sortConfig.key);

        if (aValue < bValue || aValue === undefined) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue || bValue === undefined) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};
