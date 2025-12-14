import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Database, X } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';

export function UploadSection({ onAnalysisStart, systemStatus, hasActiveJob }) {
    const [boqFile, setBoqFile] = useState(null);
    const [sorFile, setSorFile] = useState(null);
    const [sorUpdating, setSorUpdating] = useState(false);
    const [starting, setStarting] = useState(false);

    const boqInputRef = useRef(null);
    const sorInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e, setFile) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const updateSorDatabase = async () => {
        if (!sorFile) return;
        setSorUpdating(true);
        try {
            const formData = new FormData();
            formData.append('file', sorFile);
            await axios.post('/api/update-sor', formData);
            alert('SOR Database Updated Successfully');
            setSorFile(null);
        } catch (e) {
            alert('Failed to update SOR: ' + (e.response?.data?.detail || e.message));
        } finally {
            setSorUpdating(false);
        }
    };

    const startAnalysis = async () => {
        if (!boqFile) return;
        setStarting(true);
        try {
            const formData = new FormData();
            formData.append('file', boqFile);
            if (sorFile) {
                formData.append('sor_file', sorFile);
            }

            const res = await axios.post('/api/estimate-cost', formData);

            const newJob = {
                task_id: res.data.task_id,
                filename: boqFile.name,
                status: 'processing',
                start_time: Date.now(),
                result: null,
                error: null
            };

            onAnalysisStart(newJob);
            setBoqFile(null);
            setSorFile(null);
        } catch (e) {
            alert('Failed to start analysis: ' + (e.response?.data?.detail || e.message));
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* BOQ Upload Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-blue-50 rounded text-blue-600">
                        <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Project Files</h2>
                </div>

                <p className="text-xs text-gray-500 mb-4">Upload Bill of Quantities (BOQ) for analysis.</p>

                <div
                    onClick={() => boqInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, setBoqFile)}
                    className={cn(
                        "border border-dashed rounded-md p-8 text-center transition-colors",
                        boqFile ? "border-blue-500 bg-blue-50/50 cursor-default" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
                    )}
                >
                    <input
                        type="file"
                        ref={boqInputRef}
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => setBoqFile(e.target.files?.[0] || null)}
                    />
                    {boqFile ? (
                        <div className="flex items-center justify-center gap-3 text-blue-700">
                            <FileSpreadsheet className="w-5 h-5" />
                            <span className="text-sm font-medium">{boqFile.name}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBoqFile(null);
                                    // Reset input value to allow re-selecting same file
                                    if (boqInputRef.current) boqInputRef.current.value = '';
                                }}
                                className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors"
                                title="Remove file"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <UploadCloud className="w-8 h-8 mx-auto text-gray-300" />
                            <div className="text-xs text-gray-500">
                                <span><span className="font-semibold text-blue-600">Click to upload</span> or drag and drop</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SOR Update Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                        <Database className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Knowledge Base</h3>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1">
                        <div
                            onClick={() => sorInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, setSorFile)}
                            className={cn(
                                "border border-gray-200 rounded-md p-2.5 cursor-pointer text-xs text-center transition-colors truncate relative flex items-center justify-center gap-2",
                                sorFile ? "bg-indigo-50 border-indigo-200 text-indigo-700 cursor-default" : "hover:bg-gray-50 text-gray-400"
                            )}
                        >
                            <input
                                type="file"
                                ref={sorInputRef}
                                className="hidden"
                                accept=".xlsx,.xls"
                                onChange={(e) => setSorFile(e.target.files?.[0] || null)}
                            />
                            {sorFile ? (
                                <>
                                    <span>{sorFile.name}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSorFile(null);
                                            if (sorInputRef.current) sorInputRef.current.value = '';
                                        }}
                                        className="p-0.5 hover:bg-indigo-100 rounded-full text-indigo-400 hover:text-indigo-600 transition-colors"
                                        title="Remove file"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : "Select SOR File (Optional)..."}
                        </div>
                    </div>
                    {sorFile && (
                        <button
                            onClick={updateSorDatabase}
                            disabled={sorUpdating}
                            className="px-4 py-2 bg-gray-900 text-white rounded-md text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            {sorUpdating ? "Updating..." : "Update"}
                        </button>
                    )}
                </div>
            </div>

            {/* Start Button */}
            <button
                onClick={startAnalysis}
                disabled={!boqFile || starting || !systemStatus}
                className={cn(
                    "w-full py-2 rounded-lg font-semibold text-sm text-white shadow-sm transition-all",
                    (!boqFile || starting || !systemStatus)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                )}
            >
                {starting ? (
                    <span className="flex items-center justify-center gap-2">
                        <UploadCloud className="w-4 h-4 animate-bounce" /> Processing...
                    </span>
                ) : (
                    <span>Start Analysis</span>
                )}
            </button>
        </div>
    );
}
