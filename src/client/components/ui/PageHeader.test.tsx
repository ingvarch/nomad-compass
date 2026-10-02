import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title and description', () => {
    render(<PageHeader title="Cluster Dashboard" description="Overview of Nomad cluster" />);

    expect(screen.getByText('Cluster Dashboard')).toBeTruthy();
    expect(screen.getByText('Overview of Nomad cluster')).toBeTruthy();
  });

  it('renders actions and applies actionsClassName', () => {
    render(
      <PageHeader
        title="Jobs"
        actions={<button>Create Job</button>}
        actionsClassName="hidden sm:flex"
      />
    );

    const button = screen.getByText('Create Job');
    expect(button).toBeTruthy();
    const actionsWrapper = button.parentElement;
    expect(actionsWrapper?.className).toContain('hidden sm:flex');
  });

  it('does not render actions container when actions prop is omitted', () => {
    const { container } = render(<PageHeader title="Overview" />);
    expect(container.querySelectorAll('button').length).toBe(0);
  });
});
