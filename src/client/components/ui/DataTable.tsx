import type { ReactNode } from 'react';
import EmptyState from './EmptyState';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableRowHoverStyles,
} from '../../lib/styles';

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
        <EmptyState
          message={emptyState.message}
          icon={emptyState.icon}
          title={emptyState.title}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className={tableStyles}>
          <thead className={tableHeaderStyles}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${tableHeaderCellStyles} ${
                    col.textAlign === 'right' ? 'text-right' : ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tableBodyStyles}>
            {items.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={`${tableRowHoverStyles} ${
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
