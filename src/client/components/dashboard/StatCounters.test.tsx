import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatCounters } from './StatCounters';
import { NomadJobListStub, NomadNode, NomadNamespace } from '../../types/nomad';

const mockJobs: NomadJobListStub[] = [
  {
    ID: 'job-1',
    ParentID: '',
    Name: 'job-1',
    Namespace: 'default',
    Type: 'service',
    Status: 'running',
    Stop: false,
    Periodic: false,
    ParameterizedJob: false,
    JobSummary: {
      JobID: 'job-1',
      Summary: {
        web: {
          Complete: 0,
          Failed: 3,
          Running: 4,
          Starting: 0,
          Lost: 0,
          Unknown: 0,
        },
      },
    },
    SubmitTime: 0,
  },
];

const mockNodes: NomadNode[] = [
  {
    ID: 'node-1',
    Name: 'node-1',
    Datacenter: 'dc1',
    Drain: false,
    Status: 'ready',
    NodeClass: '',
    Version: '2.0.7',
  } as NomadNode,
];

const mockNamespaces: NomadNamespace[] = [
  { Name: 'default', Description: 'Default' },
  { Name: 'monitoring', Description: 'Monitoring' },
  { Name: 'production', Description: 'Production' },
  { Name: 'staging', Description: 'Staging' },
];

describe('StatCounters', () => {
  it('renders loading skeletons when loading is true', () => {
    const { container } = render(
      <MemoryRouter>
        <StatCounters
          jobs={[]}
          nodes={[]}
          namespaces={[]}
          activeFailedAllocations={0}
          loading={true}
        />
      </MemoryRouter>
    );

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBe(4);
  });

  it('renders all 4 cards with correct titles and totals', () => {
    render(
      <MemoryRouter>
        <StatCounters
          jobs={mockJobs}
          nodes={mockNodes}
          namespaces={mockNamespaces}
          activeFailedAllocations={0}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Jobs')).toBeTruthy();
    expect(screen.getByText('Nodes')).toBeTruthy();
    expect(screen.getByText('Allocations')).toBeTruthy();
    expect(screen.getByText('Namespaces')).toBeTruthy();

    // Check that totals are rendered
    // Jobs: 1 running job -> total 1
    // Nodes: 1 ready node -> total 1
    // Allocations: 4 running + 0 pending + 0 activeFailed -> total 4
    // Namespaces: 4 namespaces -> total 4
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(2);
  });

  it('renders allocation breakdown with active failed and historical failed counts', () => {
    render(
      <MemoryRouter>
        <StatCounters
          jobs={mockJobs}
          nodes={mockNodes}
          namespaces={mockNamespaces}
          activeFailedAllocations={0}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/4 Running/)).toBeTruthy();
    expect(screen.getByText(/0 Failed/)).toBeTruthy();
    expect(screen.getByText('(3)')).toBeTruthy(); // Historical failures from JobSummary
  });

  it('renders navigation links for cards and status filters', () => {
    render(
      <MemoryRouter>
        <StatCounters
          jobs={mockJobs}
          nodes={mockNodes}
          namespaces={mockNamespaces}
          activeFailedAllocations={0}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Allocations/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Namespaces/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /4 Running/i })).toBeTruthy();
  });
});
