import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable, { type Column } from './DataTable';

interface TestItem {
  id: string;
  name: string;
}

const columns: Column<TestItem>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (item) => <span>{item.name}</span>,
  },
];

describe('DataTable', () => {
  test('renders desktop table view', () => {
    const items: TestItem[] = [
      { id: '1', name: 'Item One' },
      { id: '2', name: 'Item Two' },
    ];

    render(
      <DataTable
        items={items}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Item One')).toBeTruthy();
    expect(screen.getByText('Item Two')).toBeTruthy();
  });

  test('renders mobile cards when mobileCardRenderer is provided', () => {
    const items: TestItem[] = [{ id: '1', name: 'Mobile Card Item' }];

    render(
      <DataTable
        items={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        mobileCardRenderer={(item) => (
          <div data-testid="mobile-card">Card: {item.name}</div>
        )}
      />
    );

    expect(screen.getByTestId('mobile-card')).toBeTruthy();
    expect(screen.getByText('Card: Mobile Card Item')).toBeTruthy();
  });

  test('renders empty state when items list is empty', () => {
    render(
      <DataTable
        items={[]}
        columns={columns}
        keyExtractor={(item: TestItem) => item.id}
        emptyState={{ message: 'Nothing here' }}
      />
    );

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  test('triggers onRowClick when row or mobile card is clicked', () => {
    let clickedItem: TestItem | null = null;
    const items: TestItem[] = [{ id: '1', name: 'Clickable' }];

    render(
      <DataTable
        items={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => { clickedItem = item; }}
        mobileCardRenderer={(item) => <div>{item.name}</div>}
      />
    );

    const cards = screen.getAllByText('Clickable');
    fireEvent.click(cards[0]);
    expect(clickedItem as unknown as TestItem).toEqual({ id: '1', name: 'Clickable' });
  });
});
