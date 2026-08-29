import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as applicationsApi from './api/applicationsApi';

vi.mock('./api/applicationsApi');

const sampleApplication = {
  id: '1',
  company: 'Acme Corp',
  role: 'Backend Engineer',
  status: 'APPLIED',
  dateApplied: '2026-08-01T00:00:00.000Z',
  resumeVersion: 'v1-backend',
  jobDescription: 'Build APIs.',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading state before applications arrive', () => {
    applicationsApi.listApplications.mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByText(/loading applications/i)).toBeInTheDocument();
  });

  it('renders applications returned from the API', async () => {
    applicationsApi.listApplications.mockResolvedValue([sampleApplication]);

    render(<App />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    applicationsApi.listApplications.mockRejectedValue(
      new Error('Could not reach the server'),
    );

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('submits the add-application form and refreshes the list', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sampleApplication]);
    applicationsApi.createApplication.mockResolvedValue(sampleApplication);

    render(<App />);

    await screen.findByText(/no applications yet/i);

    await user.type(screen.getByLabelText(/company/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/^role$/i), 'Backend Engineer');
    fireEvent.change(screen.getByLabelText(/date applied/i), {
      target: { value: '2026-08-01' },
    });
    await user.type(screen.getByLabelText(/resume version/i), 'v1-backend');
    await user.type(screen.getByLabelText(/job description/i), 'Build APIs.');

    await user.click(screen.getByRole('button', { name: /add application/i }));

    await waitFor(() => expect(applicationsApi.createApplication).toHaveBeenCalledTimes(1));
    expect(applicationsApi.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Acme Corp', role: 'Backend Engineer' }),
    );
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(applicationsApi.listApplications).toHaveBeenCalledTimes(2);
  });

  it('deletes an application after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    applicationsApi.listApplications
      .mockResolvedValueOnce([sampleApplication])
      .mockResolvedValueOnce([]);
    applicationsApi.deleteApplication.mockResolvedValue(null);

    render(<App />);

    await screen.findByText('Acme Corp');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(applicationsApi.deleteApplication).toHaveBeenCalledWith('1'));
    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
  });
});
