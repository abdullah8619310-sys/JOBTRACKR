function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function ApplicationList({
  applications,
  isLoading,
  error,
  onRetry,
  onView,
  onEdit,
  onDelete,
  deletingId,
}) {
  if (isLoading) {
    return <p>Loading applications...</p>;
  }

  if (error) {
    return (
      <div className="list-error">
        <p role="alert">{error}</p>
        {onRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    );
  }

  if (applications.length === 0) {
    return <p>No applications yet. Add one above to get started.</p>;
  }

  return (
    <table className="applications-table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Role</th>
          <th>Status</th>
          <th>Date Applied</th>
          <th>Resume Version</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((application) => (
          <tr key={application.id}>
            <td>{application.company}</td>
            <td>{application.role}</td>
            <td>{application.status}</td>
            <td>{formatDate(application.dateApplied)}</td>
            <td>{application.resumeVersion}</td>
            <td>
              <button onClick={() => onView(application.id)}>View</button>
              <button onClick={() => onEdit(application.id)}>Edit</button>
              <button
                onClick={() => onDelete(application.id)}
                disabled={deletingId === application.id}
              >
                {deletingId === application.id ? 'Deleting...' : 'Delete'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ApplicationList;
