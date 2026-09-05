import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as applicationsApi from './api/applicationsApi';

vi.mock('./api/applicationsApi');

// dateApplied has a `min` of today (a record's dateApplied can never be
// before its own creation date), so submitting the real form in tests must
// use today's date — a fixed past date would fail the input's native
// min-date constraint in jsdom.
const TODAY = new Date().toISOString().slice(0, 10);

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

const sampleStaleApplication = {
  id: '2',
  company: 'Telenor',
  role: 'Web Developer',
  status: 'APPLIED',
  dateApplied: '2026-08-25T00:00:00.000Z',
  resumeVersion: 'v1',
};

// Called unconditionally on mount by every test below (App fetches both the
// main list and the stale list on load); default it here so tests that
// aren't specifically exercising the Follow-up flow don't need to think
// about it.
function mockDefaultStaleList() {
  applicationsApi.listStaleApplications.mockResolvedValue([]);
}

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
      target: { value: TODAY },
    });
    await user.type(screen.getByLabelText(/resume version/i), 'v1-backend');
    await user.type(screen.getByLabelText(/resume text/i), 'Experienced engineer.');
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

  it('analyzes an application from the details panel and displays the result', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications.mockResolvedValue([sampleApplication]);
    applicationsApi.getApplication.mockResolvedValue(sampleApplication);
    applicationsApi.analyzeApplication.mockResolvedValue({
      matchScore: 82,
      missingKeywords: ['Kubernetes'],
      suggestions: ['Mention specific metrics.', 'Highlight leadership experience.'],
    });

    render(<App />);

    await screen.findByText('Acme Corp');
    await user.click(screen.getByRole('button', { name: /view/i }));

    await screen.findByText('Application Details');
    await user.click(screen.getByRole('button', { name: /analyze fit/i }));

    expect(applicationsApi.analyzeApplication).toHaveBeenCalledWith('1');
    expect(await screen.findByText(/82/)).toBeInTheDocument();
    expect(screen.getByText(/Kubernetes/)).toBeInTheDocument();
    expect(screen.getByText('Mention specific metrics.')).toBeInTheDocument();
  });

  it('shows an analysis error without crashing when analyze fails', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications.mockResolvedValue([sampleApplication]);
    applicationsApi.getApplication.mockResolvedValue(sampleApplication);
    applicationsApi.analyzeApplication.mockRejectedValue(
      new Error('This application has no resume text saved yet.'),
    );

    render(<App />);

    await screen.findByText('Acme Corp');
    await user.click(screen.getByRole('button', { name: /view/i }));

    await screen.findByText('Application Details');
    await user.click(screen.getByRole('button', { name: /analyze fit/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This application has no resume text saved yet.',
    );
  });

  it('displays stale applications returned from the API', async () => {
    applicationsApi.listApplications.mockResolvedValue([]);
    applicationsApi.listStaleApplications.mockResolvedValue([sampleStaleApplication]);

    render(<App />);

    expect(await screen.findByText('Telenor')).toBeInTheDocument();
    expect(screen.getByText('Web Developer')).toBeInTheDocument();
  });

  it('shows the empty state when there are no stale applications', async () => {
    applicationsApi.listApplications.mockResolvedValue([]);
    mockDefaultStaleList();

    render(<App />);

    expect(await screen.findByText(/no stale applications found/i)).toBeInTheDocument();
  });

  it('generates a follow-up draft and displays an editable subject and body', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications.mockResolvedValue([]);
    applicationsApi.listStaleApplications.mockResolvedValue([sampleStaleApplication]);
    applicationsApi.generateFollowUp.mockResolvedValue({
      subject: 'Checking in regarding Web Developer role',
      body: 'Dear Hiring Team, ...',
    });

    render(<App />);

    await screen.findByText('Telenor');
    await user.click(screen.getByRole('button', { name: /view \/ follow up/i }));

    await screen.findByText('Follow-up Draft');
    await user.click(screen.getByRole('button', { name: /generate follow-up/i }));

    expect(applicationsApi.generateFollowUp).toHaveBeenCalledWith('2');
    expect(await screen.findByLabelText(/subject/i)).toHaveValue(
      'Checking in regarding Web Developer role',
    );
    expect(screen.getByLabelText(/body/i)).toHaveValue('Dear Hiring Team, ...');

    await user.type(screen.getByLabelText(/subject/i), '!');
    expect(screen.getByLabelText(/subject/i)).toHaveValue(
      'Checking in regarding Web Developer role!',
    );
  });

  it('shows a generating state while the follow-up request is in flight', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications.mockResolvedValue([]);
    applicationsApi.listStaleApplications.mockResolvedValue([sampleStaleApplication]);
    applicationsApi.generateFollowUp.mockReturnValue(new Promise(() => {}));

    render(<App />);

    await screen.findByText('Telenor');
    await user.click(screen.getByRole('button', { name: /view \/ follow up/i }));
    await screen.findByText('Follow-up Draft');

    await user.click(screen.getByRole('button', { name: /generate follow-up/i }));

    expect(await screen.findByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('shows an error without crashing when follow-up generation fails', async () => {
    const user = userEvent.setup();
    applicationsApi.listApplications.mockResolvedValue([]);
    applicationsApi.listStaleApplications.mockResolvedValue([sampleStaleApplication]);
    applicationsApi.generateFollowUp.mockRejectedValue(
      new Error('AI provider is not configured on this server (missing GROQ_API_KEY)'),
    );

    render(<App />);

    await screen.findByText('Telenor');
    await user.click(screen.getByRole('button', { name: /view \/ follow up/i }));
    await screen.findByText('Follow-up Draft');

    await user.click(screen.getByRole('button', { name: /generate follow-up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'AI provider is not configured on this server (missing GROQ_API_KEY)',
    );
  });
});
