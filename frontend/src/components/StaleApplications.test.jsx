import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StaleApplications from './StaleApplications';

const sampleStale = [
  {
    id: '1',
    company: 'Telenor',
    role: 'Web Developer',
    status: 'APPLIED',
    dateApplied: '2026-08-25T00:00:00.000Z',
    resumeVersion: 'v1',
  },
];

const noop = () => {};

describe('StaleApplications', () => {
  it('shows a loading state', () => {
    render(<StaleApplications applications={[]} isLoading onSelect={noop} onClose={noop} onGenerate={noop} onDraftChange={noop} />);

    expect(screen.getByText(/loading stale applications/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no stale applications', () => {
    render(
      <StaleApplications
        applications={[]}
        isLoading={false}
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByText(/no stale applications found/i)).toBeInTheDocument();
  });

  it('shows an error state', () => {
    render(
      <StaleApplications
        applications={[]}
        isLoading={false}
        error="Could not reach the server"
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('renders stale applications in a table', () => {
    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByText('Telenor')).toBeInTheDocument();
    expect(screen.getByText('Web Developer')).toBeInTheDocument();
  });

  it('calls onSelect with the application id when View / Follow Up is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        onSelect={onSelect}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: /view \/ follow up/i }));

    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('shows the selected application\'s details in the follow-up panel', () => {
    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByText('Follow-up Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate follow-up/i })).toBeInTheDocument();
  });

  it('calls onGenerate with the selected application id when Generate Follow-up is clicked', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();

    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        onSelect={noop}
        onClose={noop}
        onGenerate={onGenerate}
        onDraftChange={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: /generate follow-up/i }));

    expect(onGenerate).toHaveBeenCalledWith('1');
  });

  it('shows a generating state and disables the button', () => {
    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        isGenerating
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('shows a generate error', () => {
    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        generateError="Follow-up Agent call failed"
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Follow-up Agent call failed');
  });

  it('displays the generated subject and body', () => {
    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        draft={{ subject: 'Checking in regarding Web Developer role', body: 'Dear Hiring Team, ...' }}
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={noop}
      />,
    );

    expect(screen.getByLabelText(/subject/i)).toHaveValue('Checking in regarding Web Developer role');
    expect(screen.getByLabelText(/body/i)).toHaveValue('Dear Hiring Team, ...');
  });

  it('allows editing the subject and reports the change', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();

    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        draft={{ subject: 'Original subject', body: 'Original body' }}
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={onDraftChange}
      />,
    );

    await user.type(screen.getByLabelText(/subject/i), '!');

    expect(onDraftChange).toHaveBeenCalledWith({ subject: 'Original subject!', body: 'Original body' });
  });

  it('allows editing the body and reports the change', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();

    render(
      <StaleApplications
        applications={sampleStale}
        isLoading={false}
        selectedId="1"
        draft={{ subject: 'Original subject', body: 'Original body' }}
        onSelect={noop}
        onClose={noop}
        onGenerate={noop}
        onDraftChange={onDraftChange}
      />,
    );

    await user.type(screen.getByLabelText(/body/i), '!');

    expect(onDraftChange).toHaveBeenCalledWith({ subject: 'Original subject', body: 'Original body!' });
  });
});
