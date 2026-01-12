import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  textAlign?: 'left' | 'right';
  render: (item: T, index: number) => ReactNode;
}

interface EmptyStateConfig {
  message: string;
  icon?: ReactNode;
  title?: string;
}

interface DataTableProps<T> {
  items: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  emptyState?: EmptyStateConfig;
}

function DataTable<T>({
  items,
  columns,
  keyExtractor,
  onRowClick,
  emptyState = { message: 'No items found.' },
}: DataTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-8 text-center">
          {emptyState.icon && (
            <div className="mb-2">{emptyState.icon}</div>
          )}
          {emptyState.title && (
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {emptyState.title}
            </h3>
          )}
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {emptyState.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase ${
                    col.textAlign === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 whitespace-nowrap ${
                      col.textAlign === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
