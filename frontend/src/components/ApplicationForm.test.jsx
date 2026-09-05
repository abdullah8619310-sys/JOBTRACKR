import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationForm from './ApplicationForm';

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

// dateApplied has no restriction relative to the record's creation date —
// any past, present, or future date is accepted, in both create and edit
// mode, so a user can log an application retroactively.
describe('ApplicationForm dateApplied has no minimum date restriction', () => {
  const CREATED_AT = '2026-08-01T00:00:00.000Z';
  const PAST_DATE = '2026-07-15';
  const VALID_FIELDS = {
    company: 'Acme Corp',
    role: 'Backend Engineer',
    resumeVersion: 'v1',
    resumeText: 'Experienced engineer.',
    jobDescription: 'Build APIs.',
  };

  it('does not set a min attribute on the date input when creating', () => {
    render(<ApplicationForm mode="create" onSubmit={() => {}} />);

    expect(screen.getByLabelText(/date applied/i)).not.toHaveAttribute('min');
  });

  it('does not set a min attribute on the date input when editing', () => {
    render(
      <ApplicationForm
        mode="edit"
        initialValues={{ createdAt: CREATED_AT, dateApplied: CREATED_AT, ...VALID_FIELDS }}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByLabelText(/date applied/i)).not.toHaveAttribute('min');
  });

  it('accepts a dateApplied from before the record was created when creating', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ApplicationForm mode="create" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), VALID_FIELDS.company);
    await user.type(screen.getByLabelText(/^role$/i), VALID_FIELDS.role);
    fireEvent.change(screen.getByLabelText(/date applied/i), { target: { value: PAST_DATE } });
    await user.type(screen.getByLabelText(/resume version/i), VALID_FIELDS.resumeVersion);
    await user.type(screen.getByLabelText(/resume text/i), VALID_FIELDS.resumeText);
    await user.type(screen.getByLabelText(/job description/i), VALID_FIELDS.jobDescription);
    await user.click(screen.getByRole('button', { name: /add application/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dateApplied: PAST_DATE }));
  });

  it("accepts a dateApplied before the record's createdAt when editing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ApplicationForm
        mode="edit"
        initialValues={{ createdAt: CREATED_AT, dateApplied: CREATED_AT, ...VALID_FIELDS }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/date applied/i), { target: { value: PAST_DATE } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dateApplied: PAST_DATE }));
  });
});
