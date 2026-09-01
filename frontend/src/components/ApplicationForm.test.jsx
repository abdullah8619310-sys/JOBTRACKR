import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationForm from './ApplicationForm';

// dateApplied has a `min` of today (a record's dateApplied can never be
// before its own creation date), so tests must use today's date — a fixed
// past date would fail the input's native min-date constraint in jsdom.
const TODAY = new Date().toISOString().slice(0, 10);

describe('ApplicationForm', () => {
  it('submits the entered values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ApplicationForm mode="create" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/^role$/i), 'Backend Engineer');
    fireEvent.change(screen.getByLabelText(/date applied/i), {
      target: { value: TODAY },
    });
    await user.type(screen.getByLabelText(/resume version/i), 'v1-backend');
    await user.type(screen.getByLabelText(/resume text/i), 'Experienced engineer.');
    await user.type(screen.getByLabelText(/job description/i), 'Build APIs.');

    await user.click(screen.getByRole('button', { name: /add application/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      company: 'Acme Corp',
      role: 'Backend Engineer',
      status: 'APPLIED',
      dateApplied: TODAY,
      resumeVersion: 'v1-backend',
      resumeText: 'Experienced engineer.',
      jobDescription: 'Build APIs.',
    });
  });

  it('shows a submit error message when provided', () => {
    render(
      <ApplicationForm mode="create" onSubmit={() => {}} submitError="company is required" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('company is required');
  });
});
