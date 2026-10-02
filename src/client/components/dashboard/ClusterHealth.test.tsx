import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ClusterHealth } from './ClusterHealth';
import { NomadNode, NomadAgentSelf, NomadAgentMembers } from '../../types/nomad';

const mockAgentSelf: NomadAgentSelf = {
  config: {
    Version: {
      Version: '2.0.7',
      Revision: '',
      BuildDate: '',
    },
    Region: 'global',
    Datacenter: 'dc1',
  },
  stats: {},
  member: {
    Name: 'nomad-server-01',
    Addr: '127.0.0.1',
    Port: 4648,
    Status: 'alive',
  },
};

const mockAgentMembers: NomadAgentMembers = {
  ServerName: 'nomad-server-01',
  ServerRegion: 'global',
  ServerDC: 'dc1',
  Members: [
    {
      Name: 'nomad-server-01',
      Addr: '127.0.0.1',
      Port: 4648,
      Status: 'alive',
      ProtocolMin: 1,
      ProtocolMax: 5,
      ProtocolCur: 2,
      DelegateMin: 1,
      DelegateMax: 5,
      DelegateCur: 2,
      Leader: true,
    },
  ],
};

const mockHealthyNodes: NomadNode[] = [
  {
    ID: 'node-1',
    Name: 'worker-1',
    Status: 'ready',
    Drain: false,
    Datacenter: 'dc1',
    NodeClass: '',
    Version: '2.0.7',
  } as NomadNode,
];

describe('ClusterHealth', () => {
  it('renders loading skeleton when loading is true', () => {
    render(
      <ClusterHealth
        agentSelf={null}
        agentMembers={null}
        nodes={[]}
        activeFailedAllocations={0}
        loading={true}
      />
    );

    expect(screen.getByRole('status', { name: /loading cluster health/i })).toBeTruthy();
  });

  it('renders healthy status with version and region badges', () => {
    render(
      <ClusterHealth
        agentSelf={mockAgentSelf}
        agentMembers={mockAgentMembers}
        nodes={mockHealthyNodes}
        activeFailedAllocations={0}
      />
    );

    expect(screen.getByText('Cluster Healthy')).toBeTruthy();
    expect(screen.getByText('v2.0.7')).toBeTruthy();
    expect(screen.getByText('global')).toBeTruthy();
    expect(screen.getByText(/nomad-server-01/)).toBeTruthy();
  });

  it('renders degraded status when active failed allocations exist', () => {
    render(
      <ClusterHealth
        agentSelf={mockAgentSelf}
        agentMembers={mockAgentMembers}
        nodes={mockHealthyNodes}
        activeFailedAllocations={2}
      />
    );

    expect(screen.getByText('Cluster Degraded')).toBeTruthy();
  });

  it('renders degraded status when a node is draining', () => {
    const drainingNodes: NomadNode[] = [
      {
        ...mockHealthyNodes[0],
        Drain: true,
      },
    ];

    render(
      <ClusterHealth
        agentSelf={mockAgentSelf}
        agentMembers={mockAgentMembers}
        nodes={drainingNodes}
        activeFailedAllocations={0}
      />
    );

    expect(screen.getByText('Cluster Degraded')).toBeTruthy();
  });

  it('renders critical status when a node is down', () => {
    const downNodes: NomadNode[] = [
      {
        ...mockHealthyNodes[0],
        Status: 'down',
      },
    ];

    render(
      <ClusterHealth
        agentSelf={mockAgentSelf}
        agentMembers={mockAgentMembers}
        nodes={downNodes}
        activeFailedAllocations={0}
      />
    );

    expect(screen.getByText('Cluster Critical')).toBeTruthy();
  });
});
