function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function ApplicationDetails({ application, isLoading, error, onClose, onEdit }) {
  return (
    <div className="application-details">
      <div className="panel-header">
        <h3>Application Details</h3>
        <button onClick={onClose}>Close</button>
      </div>

      {isLoading && <p>Loading details...</p>}
      {error && (
        <p role="alert">{error}</p>
      )}

      {application && !isLoading && !error && (
        <>
          <dl>
            <dt>Company</dt>
            <dd>{application.company}</dd>

            <dt>Role</dt>
            <dd>{application.role}</dd>

            <dt>Status</dt>
            <dd>{application.status}</dd>

            <dt>Date Applied</dt>
            <dd>{formatDateTime(application.dateApplied)}</dd>

            <dt>Resume Version</dt>
            <dd>{application.resumeVersion}</dd>

            <dt>Resume Text</dt>
            <dd className="job-description">{application.resumeText}</dd>

            <dt>Job Description</dt>
            <dd className="job-description">{application.jobDescription}</dd>

            <dt>Created At</dt>
            <dd>{formatDateTime(application.createdAt)}</dd>

            <dt>Updated At</dt>
            <dd>{formatDateTime(application.updatedAt)}</dd>
          </dl>

          <button onClick={() => onEdit(application.id)}>Edit</button>
        </>
      )}
    </div>
  );
}

export default ApplicationDetails;
