function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function ApplicationDetails({
  application,
  isLoading,
  error,
  onClose,
  onEdit,
  onAnalyze,
  isAnalyzing,
  analysisResult,
  analysisError,
}) {
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

          <div className="details-actions">
            <button onClick={() => onEdit(application.id)}>Edit</button>
            <button onClick={() => onAnalyze(application.id)} disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Fit'}
            </button>
          </div>

          {analysisError && (
            <p className="form-error" role="alert">
              {analysisError}
            </p>
          )}

          {analysisResult && (
            <div className="analysis-result">
              <h4>Resume Fit Analysis</h4>
              <p>
                <strong>Match Score:</strong> {analysisResult.matchScore}
              </p>
              <p>
                <strong>Missing Keywords:</strong>{' '}
                {analysisResult.missingKeywords.length > 0
                  ? analysisResult.missingKeywords.join(', ')
                  : 'None'}
              </p>
              <strong>Suggestions:</strong>
              <ul>
                {analysisResult.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ApplicationDetails;
