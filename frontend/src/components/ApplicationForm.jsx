import { useState } from 'react';
import { APPLICATION_STATUSES } from '../constants';

const EMPTY_VALUES = {
  company: '',
  role: '',
  status: 'APPLIED',
  dateApplied: '',
  resumeVersion: '',
  jobDescription: '',
};

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function ApplicationForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}) {
  const [values, setValues] = useState(() => ({
    ...EMPTY_VALUES,
    ...initialValues,
    dateApplied: toDateInputValue(initialValues?.dateApplied),
  }));

  const isEdit = mode === 'edit';

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className="application-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          value={values.company}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="role">Role</label>
        <input
          id="role"
          name="role"
          type="text"
          value={values.role}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={values.status} onChange={handleChange}>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="dateApplied">Date Applied</label>
        <input
          id="dateApplied"
          name="dateApplied"
          type="date"
          value={values.dateApplied}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="resumeVersion">Resume Version</label>
        <input
          id="resumeVersion"
          name="resumeVersion"
          type="text"
          value={values.resumeVersion}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="jobDescription">Job Description</label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows={4}
          value={values.jobDescription}
          onChange={handleChange}
          required
        />
      </div>

      {submitError && (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Application'}
        </button>
        {isEdit && onCancel && (
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default ApplicationForm;
