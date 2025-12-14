import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { X, TrendingUp, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Treemap } from 'recharts';
import { KPICard } from './KPICard';
import { DataGrid } from './DataGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function AnalyticsDashboard({ taskId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // Approval Workflow State
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState('idle'); // idle, success
    const [approver, setApprover] = useState({ name: '', email: '' });

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/analysis/${taskId}`);
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.detail || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [taskId]);

    // Extract data safely or provide defaults to ensure hooks run consistently
    const { kpis, charts, grid_data } = data || { kpis: { total_cost: 0 }, charts: {}, grid_data: [] };

    // Frontend Calculation for Consistency with DataGrid
    const stats = React.useMemo(() => {
        if (!grid_data || grid_data.length === 0) return { exact: 0, moderate: 0, overpriced: 0, savings: 0, errors: 0, total: 0 };

        let exact = 0;
        let moderate = 0;
        let overpriced = 0; // > 15%
        let savings = 0;    // < -15%
        let errors = 0;
        let total = grid_data.length;

        grid_data.forEach(row => {
            const matched = row["Match Found"] === true || row["Match Found"] === "✓";

            if (!matched) {
                errors++;
                return;
            }

            // Prioritize Backend Categories
            const category = row["Deviation Category"];
            if (category) {
                switch (category) {
                    case "Critical Overrun":
                        overpriced++;
                        break;
                    case "High Savings / Risk":
                        savings++;
                        break;
                    case "Moderate Overrun":
                    case "Moderate Savings":
                        moderate++; // Grouping moderate deviations together
                        break;
                    case "Reference Missing":
                    case "Vendor Price Missing":
                    case "Calculation Error": // Add to errors count
                        errors++;
                        break;
                    default:
                        exact++; // Neutral / Balanced
                }
            } else {
                // Fallback Logic (same as before)
                const boqAmountKey = Object.keys(row).find(k =>
                    k.toLowerCase().includes('amount') && k !== 'Amount.1' && k !== 'SOR Amount' && !k.toLowerCase().includes('deviation')
                ) || "Amount";

                const safeParseFloat = (val) => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
                    return 0;
                };

                const boqAmount = safeParseFloat(row[boqAmountKey]) || 0;
                const sorAmount = safeParseFloat(row["SOR Amount"]) || safeParseFloat(row["Amount.1"]) || 0;

                if (boqAmount > 0 && sorAmount > 0) {
                    const diff = boqAmount - sorAmount;
                    let percent = 0;
                    if (sorAmount > 0) percent = (diff / sorAmount) * 100;

                    if (Math.abs(percent) < 0.01) exact++;
                    else if (percent > 15.0) overpriced++;
                    else if (percent < -15.0) savings++;
                    else moderate++;
                } else {
                    exact++;
                }
            }
        });

        return { exact, moderate, overpriced, savings, errors, total };
    }, [grid_data]);

    const pieData = [
        { name: 'Exact Match', value: stats.exact, color: '#94a3b8' }, // Gray
        { name: 'Moderate (0-15%)', value: stats.moderate, color: '#facc15' }, // Yellow
        { name: 'Critical (>15%)', value: stats.overpriced, color: '#f97316' }, // Orange
        { name: 'Savings (<-15%)', value: stats.savings, color: '#14b8a6' }, // Teal
        { name: 'Errors/Missing', value: stats.errors, color: '#ef4444' }, // Red
    ].filter(d => d.value > 0);


    const formatCurrency = (value) => {
        return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };



    const insights = useMemo(() => {
        if (!grid_data) return { maxDevItem: { name: 'None', val: 0 }, totalSavings: 0 };

        let maxDev = { name: 'None', val: 0 };
        let totalSavings = 0;

        grid_data.forEach(row => {
            // Helper
            const safeParse = (v) => {
                if (typeof v === 'number') return v;
                if (!v) return 0;
                return parseFloat(v.toString().replace(/,/g, '')) || 0;
            };

            const pct = safeParse(row["Amount Deviation (%)"]);
            const dev = safeParse(row["Amount Deviation"]);

            if (pct > maxDev.val) {
                // Determine name - Robust Search
                const nameKey = Object.keys(row).find(k =>
                    ['description', 'item', 'particulars', 'detail', 'activity'].some(term => k.toLowerCase().includes(term))
                ) || Object.keys(row)[0];

                const desc = row[nameKey] ? String(row[nameKey]) : "Unknown Item";
                maxDev = { name: desc.substring(0, 25) + (desc.length > 25 ? "..." : ""), val: pct };
            }

            // Only count NEGATIVE deviation (savings) where the percentage is significant (<-15% usually, but here all savings)
            if (dev < 0) {
                // Ensure it's not just a tiny float error
                if (dev < -1.0) totalSavings += Math.abs(dev);
            }
        });
        return { maxDevItem: maxDev, totalSavings };
    }, [grid_data]);

    const costWalk = useMemo(() => {
        if (!grid_data) return [];
        let sorTotal = 0;
        let boqTotal = 0;

        grid_data.forEach(row => {
            const safeParse = (v) => {
                if (typeof v === 'number') return v;
                if (!v) return 0;
                return parseFloat(v.toString().replace(/,/g, '')) || 0;
            };

            sorTotal += safeParse(row["SOR Amount"]) || safeParse(row["Amount.1"]); // SOR Amount

            // Find BOQ Amount Key
            const boqAmtKey = Object.keys(row).find(k => k.toLowerCase().includes('amount') && k !== 'Amount.1' && k !== 'SOR Amount' && !k.toLowerCase().includes('deviation')) || "Amount";
            boqTotal += safeParse(row[boqAmtKey]);
        });

        const variance = boqTotal - sorTotal;

        return [
            { name: 'Estimated (SOR)', value: sorTotal, fill: '#94a3b8' }, // Gray
            { name: 'Variance', value: variance, fill: variance > 0 ? '#ef4444' : '#10b981' }, // Red if overrun, Green if savings
            { name: 'Quoted (Vendor)', value: boqTotal, fill: '#3b82f6' } // Blue
        ];
    }, [grid_data]);

    // Conditional Rendering - Moved to the END, after all hooks
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-700 font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Error Loading Analytics</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-50 z-50 overflow-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-screen bg-slate-50 p-6 py-8"
                >
                    <div className="max-w-7xl mx-auto space-y-4">
                        {/* Header */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                        Task  ID: {taskId}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowApprovalModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-semibold transition-colors shadow-sm"
                                    >
                                        Approve Estimate
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Approval Modal */}
                        <AnimatePresence>
                            {showApprovalModal && (
                                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">Approve Estimate</h3>
                                            <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {approvalStatus === 'success' ? (
                                            <div className="text-center py-6">
                                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                                </div>
                                                <h4 className="text-md font-bold text-gray-900 mb-1">Approval Successful!</h4>
                                                <p className="text-xs text-gray-500 mb-4">The estimate has been officially approved.</p>
                                                <button
                                                    onClick={() => { setShowApprovalModal(false); setApprovalStatus('idle'); }}
                                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-md text-xs font-semibold transition-colors"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={approver.name}
                                                        onChange={e => setApprover({ ...approver, name: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Enter your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                                                    <input
                                                        type="email"
                                                        value={approver.email}
                                                        onChange={e => setApprover({ ...approver, email: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="name@company.com"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setApprovalStatus('success')}
                                                    disabled={!approver.name || !approver.email}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-md text-xs font-semibold transition-colors mt-2"
                                                >
                                                    Confirm Approval
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* KPI Cards */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 px-1">Key Metrics</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <KPICard
                                    icon={TrendingUp}
                                    label="Critical (>15%)"
                                    value={stats.overpriced}
                                    subtitle="Review Immediately"
                                    color="orange"
                                    delay={0}
                                />
                                <KPICard
                                    icon={AlertTriangle}
                                    label="Moderate (0-15%)"
                                    value={stats.moderate}
                                    subtitle="Review if possible"
                                    color="yellow" // Mapped to yellow styles
                                    delay={0.05}
                                />
                                <KPICard
                                    icon={CheckCircle2}
                                    label="High Savings"
                                    value={stats.savings}
                                    subtitle="Below SOR Rate"
                                    color="teal"
                                    delay={0.1}
                                />
                                <KPICard
                                    icon={AlertCircle}
                                    label="Errors / Missing"
                                    value={stats.errors}
                                    subtitle="Fix Data"
                                    color="red"
                                    delay={0.15}
                                />
                            </div>
                        </div>

                        {/* Smart Insight Chips */}
                        <div className="flex flex-wrap gap-2 px-1">
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Max Variance: <span className="font-bold">{insights.maxDevItem.val.toFixed(0)}%</span> ({insights.maxDevItem.name})</span>
                            </motion.div>
                            {insights.totalSavings > 0 && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Potential Savings: <span className="font-bold">{formatCurrency(insights.totalSavings)}</span></span>
                                </motion.div>
                            )}
                        </div>

                        {/* Charts Section - 2x2 Grid */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 px-1">Analysis Charts</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Pie Chart */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Match Distribution</h4>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                labelLine={false}
                                                label={({ value }) => `${value}`}
                                                fill="#8884d8"
                                                dataKey="value"
                                                paddingAngle={5}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Cost Walk Chart */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Estimate Cost Walk (Bridge)</h4>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={costWalk} layout="vertical" barSize={20} margin={{ left: 20, right: 20 }}>
                                            <XAxis type="number" fontSize={10} tickFormatter={(val) => `₹${val / 1000}k`} />
                                            <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                formatter={(value) => formatCurrency(value)}
                                                contentStyle={{ fontSize: '12px', borderRadius: '4px' }}
                                                cursor={{ fill: '#f3f4f6' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {costWalk.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Data Grid Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 px-1">Detailed Data</h3>
                            <DataGrid data={grid_data} taskId={taskId} />
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
