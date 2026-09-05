function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function StaleApplications({
  applications = [],
  isLoading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onClose,
  onGenerate,
  isGenerating,
  generateError,
  draft,
  onDraftChange,
}) {
  const selectedApplication = applications.find((application) => application.id === selectedId) || null;

  if (isLoading) {
    return <p>Loading stale applications...</p>;
  }

  if (error) {
    return (
      <div className="list-error">
        <p role="alert">{error}</p>
        {onRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    );
  }

  return (
    <>
      {applications.length === 0 && <p>No stale applications found.</p>}

      {applications.length > 0 && (
        <table className="applications-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Date Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>{application.company}</td>
                <td>{application.role}</td>
                <td>{formatDate(application.dateApplied)}</td>
                <td>
                  <button onClick={() => onSelect(application.id)}>View / Follow Up</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedApplication && (
        <div className="follow-up-panel">
          <div className="panel-header">
            <h3>Follow-up Draft</h3>
            <button onClick={onClose}>Close</button>
          </div>

          <dl>
            <dt>Company</dt>
            <dd>{selectedApplication.company}</dd>

            <dt>Role</dt>
            <dd>{selectedApplication.role}</dd>

            <dt>Date Applied</dt>
            <dd>{formatDate(selectedApplication.dateApplied)}</dd>
          </dl>

          <button onClick={() => onGenerate(selectedApplication.id)} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Follow-up'}
          </button>

          {generateError && (
            <p className="form-error" role="alert">
              {generateError}
            </p>
          )}

          {draft && (
            <div className="follow-up-draft">
              <div className="form-field">
                <label htmlFor="follow-up-subject">Subject</label>
                <input
                  id="follow-up-subject"
                  type="text"
                  value={draft.subject}
                  onChange={(event) => onDraftChange({ ...draft, subject: event.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="follow-up-body">Body</label>
                <textarea
                  id="follow-up-body"
                  rows={8}
                  value={draft.body}
                  onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default StaleApplications;
