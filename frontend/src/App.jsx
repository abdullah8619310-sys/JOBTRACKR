import { useCallback, useEffect, useState } from 'react';
import ApplicationList from './components/ApplicationList';
import ApplicationForm from './components/ApplicationForm';
import ApplicationDetails from './components/ApplicationDetails';
import StaleApplications from './components/StaleApplications';
import {
  listApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplication,
  analyzeApplication,
  listStaleApplications,
  generateFollowUp,
} from './api/applicationsApi';
import './App.css';

function App() {
  const [applications, setApplications] = useState([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const [panelMode, setPanelMode] = useState(null); // 'view' | 'edit' | null
  const [selectedId, setSelectedId] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState(null);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const [staleApplications, setStaleApplications] = useState([]);
  const [isStaleLoading, setIsStaleLoading] = useState(true);
  const [staleError, setStaleError] = useState(null);

  const [selectedStaleId, setSelectedStaleId] = useState(null);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState(null);
  const [followUpError, setFollowUpError] = useState(null);

  const fetchApplications = useCallback(async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const data = await listApplications();
      setApplications(data);
    } catch (err) {
      setListError(err.message);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const fetchStaleApplications = useCallback(async () => {
    setIsStaleLoading(true);
    setStaleError(null);
    try {
      const data = await listStaleApplications();
      setStaleApplications(data);
    } catch (err) {
      setStaleError(err.message);
    } finally {
      setIsStaleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaleApplications();
  }, [fetchStaleApplications]);

  async function handleCreate(values) {
    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    try {
      await createApplication(values);
      setCreateSuccess(true);
      setFormResetKey((key) => key + 1);
      await fetchApplications();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function openPanel(id, mode) {
    setSelectedId(id);
    setPanelMode(mode);
    setPanelData(null);
    setPanelError(null);
    setEditError(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsPanelLoading(true);
    try {
      const data = await getApplication(id);
      setPanelData(data);
    } catch (err) {
      setPanelError(err.message);
    } finally {
      setIsPanelLoading(false);
    }
  }

  function handleView(id) {
    openPanel(id, 'view');
  }

  function handleEdit(id) {
    openPanel(id, 'edit');
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode(null);
    setPanelData(null);
    setPanelError(null);
    setEditError(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  }

  async function handleAnalyze(id) {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeApplication(id);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSelectStale(id) {
    setSelectedStaleId(id);
    setFollowUpDraft(null);
    setFollowUpError(null);
  }

  function handleCloseStale() {
    setSelectedStaleId(null);
    setFollowUpDraft(null);
    setFollowUpError(null);
  }

  async function handleGenerateFollowUp(id) {
    setIsGeneratingFollowUp(true);
    setFollowUpError(null);
    setFollowUpDraft(null);
    try {
      const result = await generateFollowUp(id);
      setFollowUpDraft(result);
    } catch (err) {
      setFollowUpError(err.message);
    } finally {
      setIsGeneratingFollowUp(false);
    }
  }

  function handleDraftChange(updatedDraft) {
    setFollowUpDraft(updatedDraft);
  }

  async function handleSaveEdit(values) {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateApplication(selectedId, values);
      setPanelData(updated);
      setPanelMode('view');
      await fetchApplications();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete this application? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteApplication(id);
      if (selectedId === id) {
        handleClosePanel();
      }
      await fetchApplications();
    } catch (err) {
      setListError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>JobTrackr</h1>
      </header>

      <main>
        <section className="add-application-section">
          <h2>Add Application</h2>
          <ApplicationForm
            key={formResetKey}
            mode="create"
            onSubmit={handleCreate}
            isSubmitting={isCreating}
            submitError={createError}
          />
          {createSuccess && <p className="form-success">Application added.</p>}
        </section>

        <section className="applications-section">
          <h2>Applications</h2>
          <ApplicationList
            applications={applications}
            isLoading={isListLoading}
            error={listError}
            onRetry={fetchApplications}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        </section>

        {panelMode && (
          <section className="panel-section">
            {panelMode === 'view' && (
              <ApplicationDetails
                application={panelData}
                isLoading={isPanelLoading}
                error={panelError}
                onClose={handleClosePanel}
                onEdit={handleEdit}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                analysisError={analysisError}
              />
            )}

            {panelMode === 'edit' && (
              <div className="edit-panel">
                <div className="panel-header">
                  <h3>Edit Application</h3>
                  <button onClick={handleClosePanel}>Close</button>
                </div>
                {isPanelLoading && <p>Loading application...</p>}
                {panelError && <p role="alert">{panelError}</p>}
                {panelData && !isPanelLoading && !panelError && (
                  <ApplicationForm
                    mode="edit"
                    initialValues={panelData}
                    onSubmit={handleSaveEdit}
                    onCancel={handleClosePanel}
                    isSubmitting={isSavingEdit}
                    submitError={editError}
                  />
                )}
              </div>
            )}
          </section>
        )}

        <section className="stale-applications-section">
          <h2>Stale Applications</h2>
          <StaleApplications
            applications={staleApplications}
            isLoading={isStaleLoading}
            error={staleError}
            onRetry={fetchStaleApplications}
            selectedId={selectedStaleId}
            onSelect={handleSelectStale}
            onClose={handleCloseStale}
            onGenerate={handleGenerateFollowUp}
            isGenerating={isGeneratingFollowUp}
            generateError={followUpError}
            draft={followUpDraft}
            onDraftChange={handleDraftChange}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
