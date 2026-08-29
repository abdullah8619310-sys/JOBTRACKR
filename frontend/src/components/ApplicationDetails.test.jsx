import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationDetails from './ApplicationDetails';

const sampleApplication = {
  id: '1',
  company: 'Acme Corp',
  role: 'Backend Engineer',
  status: 'APPLIED',
  dateApplied: '2026-08-01T00:00:00.000Z',
  resumeVersion: 'v1-backend',
  resumeText: 'Experienced backend engineer.',
  jobDescription: 'Build APIs.',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('ApplicationDetails', () => {
  it('renders the application fields', () => {
    render(<ApplicationDetails application={sampleApplication} onClose={() => {}} onEdit={() => {}} />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Experienced backend engineer.')).toBeInTheDocument();
    expect(screen.getByText('Build APIs.')).toBeInTheDocument();
  });

  it('calls onAnalyze with the application id when Analyze Fit is clicked', async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();

    render(
      <ApplicationDetails
        application={sampleApplication}
        onClose={() => {}}
        onEdit={() => {}}
        onAnalyze={onAnalyze}
      />,
    );

    await user.click(screen.getByRole('button', { name: /analyze fit/i }));

    expect(onAnalyze).toHaveBeenCalledWith('1');
  });

  it('shows an analyzing state and disables the button', () => {
    render(
      <ApplicationDetails
        application={sampleApplication}
        onClose={() => {}}
        onEdit={() => {}}
        onAnalyze={() => {}}
        isAnalyzing
      />,
    );

    const button = screen.getByRole('button', { name: /analyzing/i });
    expect(button).toBeDisabled();
  });

  it('displays the match score, missing keywords, and suggestions on success', () => {
    render(
      <ApplicationDetails
        application={sampleApplication}
        onClose={() => {}}
        onEdit={() => {}}
        onAnalyze={() => {}}
        analysisResult={{
          matchScore: 82,
          missingKeywords: ['Kubernetes', 'Docker'],
          suggestions: ['Mention container experience.', 'Quantify impact.'],
        }}
      />,
    );

    expect(screen.getByText(/82/)).toBeInTheDocument();
    expect(screen.getByText(/Kubernetes, Docker/)).toBeInTheDocument();
    expect(screen.getByText('Mention container experience.')).toBeInTheDocument();
    expect(screen.getByText('Quantify impact.')).toBeInTheDocument();
  });

  it('shows an analysis error message', () => {
    render(
      <ApplicationDetails
        application={sampleApplication}
        onClose={() => {}}
        onEdit={() => {}}
        onAnalyze={() => {}}
        analysisError="This application has no resume text saved yet."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This application has no resume text saved yet.');
  });
});
