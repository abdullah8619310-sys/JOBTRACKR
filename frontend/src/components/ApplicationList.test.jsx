import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationList from './ApplicationList';

const sampleApplications = [
  {
    id: '1',
    company: 'Acme Corp',
    role: 'Backend Engineer',
    status: 'APPLIED',
    dateApplied: '2026-08-01T00:00:00.000Z',
    resumeVersion: 'v1-backend',
  },
];

describe('ApplicationList', () => {
  it('shows a loading state', () => {
    render(<ApplicationList applications={[]} isLoading />);
    expect(screen.getByText(/loading applications/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no applications', () => {
    render(<ApplicationList applications={[]} isLoading={false} />);
    expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
  });

  it('shows an error state', () => {
    render(
      <ApplicationList applications={[]} isLoading={false} error="Could not reach the server" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('renders applications returned from the API', () => {
    render(<ApplicationList applications={sampleApplications} isLoading={false} />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('APPLIED')).toBeInTheDocument();
    expect(screen.getByText('v1-backend')).toBeInTheDocument();
  });

  it('calls onDelete with the application id when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ApplicationList
        applications={sampleApplications}
        isLoading={false}
        onView={() => {}}
        onEdit={() => {}}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
