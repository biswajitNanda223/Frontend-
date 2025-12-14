import React, { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle, XCircle, HardHat } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';

export function Sidebar({ jobs, activeJobId, onSelectJob, setSystemStatus }) {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await axios.get('/api/');
                if (res.status === 200) {
                    setStatus('online');
                    setSystemStatus(true);
                } else {
                    setStatus('error');
                    setSystemStatus(false);
                }
            } catch (e) {
                setStatus('offline');
                setSystemStatus(false);
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, [setSystemStatus]);

    return (
        <div className="w-80 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 overflow-hidden font-sans">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                    <HardHat className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 text-base tracking-tight">AI Estimator</h1>
                    <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Enterprise Suite</p>
                </div>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Status</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-gray-200">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'online' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <span className={cn(
                            "text-[10px] font-bold uppercase",
                            status === 'online' ? "text-emerald-700" : "text-red-700"
                        )}>
                            {status === 'online' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-1">Recent Projects</h3>

                <div className="space-y-1">
                    {jobs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            <Clock className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            <p>No active projects</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <button
                                key={job.task_id}
                                onClick={() => onSelectJob(job.task_id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-md transition-all text-sm group border",
                                    activeJobId === job.task_id
                                        ? "bg-blue-50 border-blue-200 shadow-sm"
                                        : "bg-transparent border-transparent hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                        "font-medium truncate flex-1 mr-2",
                                        activeJobId === job.task_id ? "text-blue-900" : "text-gray-700"
                                    )}>
                                        {job.filename}
                                    </span>
                                    {job.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                    {job.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                    {job.status === 'processing' && <Activity className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono truncate pl-0.5">
                                    ID: {job.task_id.substring(0, 8)}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                    &copy; 2025 ENGINEERING SUITE
                </p>
            </div>
        </div>
    );
}
