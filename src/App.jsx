import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { UploadSection } from './components/UploadSection';
import { AnalysisDashboard } from './components/AnalysisDashboard';

function App() {
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [systemStatus, setSystemStatus] = useState(false);

  const handleAnalysisStart = (newJob) => {
    setJobs(prev => [newJob, ...prev]);
    setActiveJobId(newJob.task_id);
  };

  const handleJobUpdate = (updatedJob) => {
    setJobs(prev => prev.map(job =>
      job.task_id === updatedJob.task_id ? updatedJob : job
    ));
  };

  const handleJobRemove = (taskId) => {
    setJobs(prev => prev.filter(job => job.task_id !== taskId));
    if (activeJobId === taskId) {
      setActiveJobId(null);
    }
  };

  // Auto-select latest job if none active
  if (!activeJobId && jobs.length > 0) {
    // Optional: automatically select the first job? For now, leave as is.
  }

  const activeJob = jobs.find(j => j.task_id === activeJobId) || null;
  const hasActiveJob = jobs.some(j => j.status === 'processing');

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 pb-10">
      <Sidebar
        jobs={jobs}
        activeJobId={activeJobId}
        onSelectJob={setActiveJobId}
        setSystemStatus={setSystemStatus}
      />

      <main className="ml-80 flex-1 p-10 h-screen overflow-hidden flex gap-10">
        <div className="w-[420px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900">New Estimation</h2>
            <p className="text-sm text-gray-500">Start a new cost analysis project</p>
          </div>
          <UploadSection
            onAnalysisStart={handleAnalysisStart}
            systemStatus={systemStatus}
            hasActiveJob={hasActiveJob}
          />
        </div>

        <div className="flex-1 h-full flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
          {activeJob ? (
            <AnalysisDashboard
              job={activeJob}
              onJobUpdate={handleJobUpdate}
              onJobRemove={handleJobRemove}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Project Selected</h3>
              <p className="text-sm max-w-xs text-center mt-2">Select a project from the sidebar or upload a new BOQ to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
