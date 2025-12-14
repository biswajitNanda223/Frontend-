import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, CheckCircle, XCircle, Loader2, ArrowRight, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function AnalysisDashboard({ job, onJobUpdate, onJobRemove }) {
    const [polling, setPolling] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);

    useEffect(() => {
        if (!job || job.status === 'completed' || job.status === 'failed') return;

        setPolling(true);
        const poll = async () => {
            try {
                const res = await axios.get(`/api/result/${job.task_id}`);
                // Response format from app.py: 
                // { "task_id": ..., "status": "...", "result": {}, "error": "", "progress": { "percent": 0, "step": "..." } }

                if (res.status === 200) {
                    const data = res.data;
                    const apiStatus = data.status; // SUCCESS, FAILURE, PENDING, STARTED...

                    let newStatus = job.status;
                    let result = job.result;
                    let error = job.error;
                    let progress = data.progress || {};

                    if (apiStatus === 'SUCCESS') {
                        newStatus = 'completed';
                        result = data.result;
                    } else if (apiStatus === 'FAILURE') {
                        newStatus = 'failed';
                        error = data.error;
                    }

                    onJobUpdate({
                        ...job,
                        status: newStatus,
                        result,
                        error,
                        progressStep: progress.step, // Assuming backend sends this
                        progressPercent: progress.percent
                    });
                }
            } catch (e) {
                console.error("Poll Error", e);
            }
        };

        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [job, onJobUpdate]);

    const handleDownload = () => {
        // Download the file
        const filename = job.result?.output_file_path?.split(/[\\/]/).pop();
        if (filename) {
            window.open(`/api/download/${filename}`, '_blank');

            // Remove job from queue after download
            if (onJobRemove) {
                setTimeout(() => {
                    onJobRemove(job.task_id);
                }, 500); // Small delay to ensure download starts
            }
        }
    };

    if (!job) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ArrowRight className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium">Select a job or start a new analysis</p>
            </div>
        );
    }

    const isProcessing = job.status === 'processing';
    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{job.filename}</h2>
                            <p className="text-xs text-gray-500 font-mono mt-1">Task ID: {job.task_id}</p>
                        </div>
                        <div className={cn(
                            "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2",
                            isProcessing && "bg-blue-100 text-blue-700",
                            isCompleted && "bg-green-100 text-green-700",
                            isFailed && "bg-red-100 text-red-700"
                        )}>
                            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isCompleted && <CheckCircle className="w-4 h-4" />}
                            {isFailed && <XCircle className="w-4 h-4" />}
                            <span className="capitalize">{job.status}</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 flex-1 flex flex-col items-center justify-center">
                    {isProcessing && (
                        <div className="w-full max-w-md space-y-4">
                            <div className="flex justify-between text-sm font-medium text-gray-600">
                                <span>{job.progressStep || "Processing..."}</span>
                                <span>{job.progressPercent || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${job.progressPercent || 5}%` }}
                                />
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">This may take a few minutes depending on BOQ size.</p>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Analysis Complete!</h3>
                                <p className="text-gray-500 mt-2">Your cost estimate is ready for download and analysis.</p>
                            </div>

                            {job.result?.output_file_path ? (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => setShowAnalytics(true)}
                                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-all"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        View Dashboard
                                    </button>

                                    <button
                                        onClick={handleDownload}
                                        className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-all"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Report
                                    </button>

                                    <p className="text-xs text-gray-400 mt-2">
                                        💡 Job will be removed from queue after download
                                    </p>
                                </div>
                            ) : (
                                <div className="text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                                    Warning: Output file path missing but job marked success.
                                </div>
                            )}
                        </div>
                    )}

                    {isFailed && (
                        <div className="text-center space-y-4 max-w-lg">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Workflow Failed</h3>
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-mono text-left overflow-auto max-h-40 border border-red-100">
                                {JSON.stringify(job.error, null, 2) || "Unknown error occurred."}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Analytics Dashboard Modal */}
            {showAnalytics && (
                <AnalyticsDashboard
                    taskId={job.task_id}
                    onClose={() => setShowAnalytics(false)}
                />
            )}
        </>
    );
}
