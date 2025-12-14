import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export function DataGrid({ data }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'errors', 'anomalies', 'critical', 'normal'
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    // Essential columns to display (matching Excel output)
    const ESSENTIAL_COLUMNS = [
        "S.No",
        "Description",
        "UOM",
        "Quantity",
        "Rate (BOQ)",
        "SOR Rate",
        "Amount (BOQ)",
        "SOR Amount",
        "Amount Deviation (%)",
        "Rate Deviation (%)",
        "Match Found"
    ];


    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        const firstRow = data[0];
        const availableColumns = Object.keys(firstRow);

        // Strict whitelist - only show these exact columns
        const visibleColumns = [];

        // Map each essential column to its actual name in the data
        for (const essential of ESSENTIAL_COLUMNS) {
            let found = null;

            // Exact match first
            if (availableColumns.includes(essential)) {
                found = essential;
            }
            // Fallback mappings
            else {
                for (const col of availableColumns) {
                    const upper = col.toUpperCase();
                    const lower = col.toLowerCase();

                    if (essential === "S.No" && (col === "S.No" || upper === "SNO")) {
                        found = col;
                        break;
                    }
                    else if (essential === "Description" && upper === "DETAILS") {
                        found = col;
                        break;
                    }
                    else if (essential === "UOM" && upper === "UOM") {
                        found = col;
                        break;
                    }
                    else if (essential === "Quantity" && (upper === "QTY." || upper === "QTY")) {
                        found = col;
                        break;
                    }
                    else if (essential === "Rate (BOQ)" && upper === "RATE") {
                        found = col;
                        break;
                    }
                    else if (essential === "SOR Rate" && upper === "SOR RATE") {
                        found = col;
                        break;
                    }
                    else if (essential === "Amount (BOQ)" && col === "AMOUNT(RS)") {
                        found = col;
                        break;
                    }
                    else if (essential === "SOR Amount" && (col === "SOR Amount" || upper === "SOR AMOUNT")) {
                        found = col;
                        break;
                    }
                    else if (essential === "Amount Deviation (%)" && col === "Amount Deviation (%)") {
                        found = col;
                        break;
                    }
                    else if (essential === "Rate Deviation (%)" && col === "Rate Deviation (%)") {
                        found = col;
                        break;
                    }
                    else if (essential === "Match Found" && (col === "Match Found" || upper === "MATCH FOUND")) {
                        found = col;
                        break;
                    }
                }
            }

            if (found) {
                visibleColumns.push(found);
            }
        }

        console.log('[DataGrid] Available columns in data:', availableColumns);
        console.log('[DataGrid] Visible columns after filtering:', visibleColumns);
        console.log('[DataGrid] Number of visible columns:', visibleColumns.length);

        return visibleColumns;
    }, [data]);

    const dataWithFrontendAnomalies = useMemo(() => {
        if (!data || data.length === 0) return [];

        const safeParseFloat = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
            return 0;
        };

        return data.map((row, index) => {
            const rowId = row._id || `row-${index}`;
            const matched = row["Match Found"] === true || row["Match Found"] === "✓";

            // Keys
            const boqAmountKey = Object.keys(row).find(k =>
                k.toLowerCase().includes('amount') && k !== 'Amount.1' && k !== 'SOR Amount' && !k.toLowerCase().includes('deviation')
            ) || "Amount";

            // Values
            const boqAmount = safeParseFloat(row[boqAmountKey]) || 0;
            const sorAmount = safeParseFloat(row["SOR Amount"]) || safeParseFloat(row["Amount.1"]) || 0;
            const sorRate = safeParseFloat(row["SOR Rate"]) || 0;
            const quantity = safeParseFloat(row["Quantity"]) || safeParseFloat(row["Qty."]) || 0;
            const boqImpliedRate = quantity > 0 ? boqAmount / quantity : 0;

            // --- Backend Deviation Data ---
            // If backend calculated it, use it. Otherwise fallback to frontend calc (legacy support)
            let amountDiff = safeParseFloat(row["Amount Deviation"]);
            let amountDiffPercent = safeParseFloat(row["Amount Deviation (%)"]);
            let backendCategory = row["Deviation Category"];

            // Fallback calculation if backend data missing
            if (matched && boqAmount > 0 && sorAmount > 0 && (amountDiff === 0 && amountDiffPercent === 0 && !backendCategory)) {
                amountDiff = boqAmount - sorAmount;
                if (sorAmount > 0) {
                    amountDiffPercent = (amountDiff / sorAmount) * 100;
                }
            }

            // --- Highlight Logic Mapped to Backend Categories ---
            let highlightType = 'normal';

            if (!matched) {
                highlightType = 'error-high'; // Not Found
            } else if (backendCategory) {
                switch (backendCategory) {
                    case "Critical Overrun":
                        highlightType = 'warning-orange';
                        break;
                    case "High Savings / Risk":
                    case "High Savings":
                        highlightType = 'success';
                        break;
                    case "Moderate Overrun":
                        highlightType = 'warning-yellow';
                        break;
                    case "Moderate Savings":
                        highlightType = 'success';
                        break;
                    case "Calculation Error":
                        highlightType = 'error-low';
                        break;
                    case "Reference Missing":
                    case "Vendor Price Missing":
                        highlightType = 'error-high';
                        break;
                    default:
                        highlightType = 'normal';
                }
            } else if (boqAmount > 0 && sorAmount > 0) {
                // Fallback Legacy Check (if category missing)
                const diff = boqAmount - sorAmount;
                const pct = (diff / sorAmount) * 100;
                if (pct > 15) highlightType = 'warning-orange';
                else if (pct > 0) highlightType = 'warning-yellow';
            }

            const reasoningKey = Object.keys(row).find(k => k.toLowerCase().includes('reason') || k.toLowerCase().includes('explanation'));
            const reasoningText = reasoningKey ? row[reasoningKey] : "No details available.";

            return {
                ...row,
                _rowId: rowId,
                _frontendHighlightType: highlightType,
                _frontendAmountDiff: amountDiff,
                _frontendAmountDiffPercent: amountDiffPercent ? (typeof amountDiffPercent === 'number' ? amountDiffPercent.toFixed(2) : amountDiffPercent) : 0,
                _boqAmountKey: boqAmountKey,
                _reasoningText: reasoningText
            };
        });
    }, [data]);

    const typeFilteredData = useMemo(() => {
        if (!dataWithFrontendAnomalies) return [];
        if (filterType === 'all') return dataWithFrontendAnomalies;

        // Errors: Includes High (Missing) and Low (Calc Error)
        if (filterType === 'errors') return dataWithFrontendAnomalies.filter(row => row._frontendHighlightType === 'error-high' || row._frontendHighlightType === 'error-low');

        // Deviations: Includes Critical (Orange) and Moderate (Yellow)
        if (filterType === 'anomalies') return dataWithFrontendAnomalies.filter(row => row._frontendHighlightType === 'warning-orange' || row._frontendHighlightType === 'warning-yellow');

        // Critical Only
        if (filterType === 'critical') return dataWithFrontendAnomalies.filter(row => row._frontendHighlightType === 'warning-orange');

        return dataWithFrontendAnomalies;
    }, [dataWithFrontendAnomalies, filterType]);

    const sortedData = useMemo(() => {
        if (!sortColumn) return typeFilteredData;
        return [...typeFilteredData].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [typeFilteredData, sortColumn, sortDirection]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return sortedData;
        return sortedData.filter(row => {
            return columns.some(col => {
                const value = String(row[col]).toLowerCase();
                return value.includes(searchTerm.toLowerCase());
            });
        });
    }, [sortedData, searchTerm, columns]);

    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('asc');
        }
    };

    const isNumericColumn = (key) => {
        const lowerKey = key.toLowerCase();
        return ['amount', 'rate', 'qty', 'quantity', 'cost', 'price', 'deviation'].some(term => lowerKey.includes(term));
    };

    const formatCellValue = (value, colName) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? '✓' : '✗';
        if (typeof value === 'number') {
            if (Number.isInteger(value) && (colName.toLowerCase().includes('qty') || colName.toLowerCase().includes('quantity'))) {
                return value.toLocaleString('en-IN');
            }
            return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(value);
    };

    const deviationCount = dataWithFrontendAnomalies.filter(r => r._frontendHighlightType === 'warning-orange' || r._frontendHighlightType === 'warning-yellow').length;
    const criticalCount = dataWithFrontendAnomalies.filter(r => r._frontendHighlightType === 'warning-orange').length;
    const errorCount = dataWithFrontendAnomalies.filter(r => r._frontendHighlightType === 'error-high' || r._frontendHighlightType === 'error-low').length;

    if (!data || data.length === 0) {
        return <div className="text-center py-12 text-gray-400 text-sm">No data available</div>;
    }

    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full font-sans">
            {/* Compact Header */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-700">Data Grid</h3>
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-40 transition-all hover:border-gray-400"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setFilterType('all')} className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border transition-colors", filterType === 'all' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}>All ({data.length})</button>
                    <button onClick={() => setFilterType('anomalies')} className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border transition-colors", filterType === 'anomalies' ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}>Deviations ({deviationCount})</button>
                    <button onClick={() => setFilterType('critical')} className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border transition-colors", filterType === 'critical' ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}>Critical ({criticalCount})</button>
                    <button onClick={() => setFilterType('errors')} className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border transition-colors", filterType === 'errors' ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}>Errors ({errorCount})</button>
                </div>
            </div>

            {/* Dense Table */}
            <div className="overflow-auto grow">
                <table className="w-full relative border-collapse text-left">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="w-8 px-2 py-2 bg-gray-100/95 border-b border-r border-gray-200 text-center"></th>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    onClick={() => handleSort(col)}
                                    className={cn(
                                        "px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100/95 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap select-none",
                                        isNumericColumn(col) ? "text-right" : "text-left"
                                    )}
                                >
                                    <div className={cn("flex items-center gap-1", isNumericColumn(col) && "justify-end")}>
                                        {col}
                                        {sortColumn === col && <span className="text-blue-500 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredData.map((row) => (
                            <React.Fragment key={row._rowId}>
                                <tr
                                    onClick={() => toggleRow(row._rowId)}
                                    className={cn(
                                        "group cursor-pointer transition-colors text-[11px]",
                                        // 1. Missing / Not Found -> DARK RED (High Visibility)
                                        row._frontendHighlightType === "error-high" && "bg-red-400 hover:bg-red-500 border-l-4 border-l-red-700 text-white font-semibold",
                                        // 2. Calculation Error -> MEDIUM RED
                                        row._frontendHighlightType === "error-low" && "bg-red-200 hover:bg-red-300 border-l-4 border-l-red-500 text-gray-900",
                                        // 3. Critical Overrun (>15%) -> Orange
                                        row._frontendHighlightType === "warning-orange" && "bg-orange-100 hover:bg-orange-200 border-l-2 border-l-orange-500",
                                        // 4. Moderate Overrun (0-15%) -> Yellow
                                        row._frontendHighlightType === "warning-yellow" && "bg-yellow-50 hover:bg-yellow-100 border-l-2 border-l-yellow-400",
                                        // Savings -> Teal
                                        row._frontendHighlightType === "success" && "bg-teal-50 hover:bg-teal-100 border-l-2 border-l-teal-400",
                                        // Normal
                                        row._frontendHighlightType === "normal" && "hover:bg-blue-50/30",

                                        expandedRows.has(row._rowId) && "bg-blue-50/50 border-b-0"
                                    )}
                                >
                                    <td className="px-1 py-1 border-r border-gray-100 text-center align-top pt-2">
                                        <button className="text-gray-400 hover:text-blue-600 transition-colors">
                                            {expandedRows.has(row._rowId) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                    </td>

                                    {columns.map((col) => {
                                        const isNum = isNumericColumn(col);
                                        const isBoqAmount = col === row._boqAmountKey;
                                        // Show badge if warning or critical
                                        const showBadge = (row._frontendHighlightType === 'warning' || row._frontendHighlightType === 'critical') && isBoqAmount;

                                        return (
                                            <td key={col} className={cn(
                                                "px-2 py-1 border-r border-gray-100 align-top",
                                                isNum ? "text-right font-mono text-gray-700" : "text-gray-600",
                                                !isNum && "max-w-[220px]"
                                            )}>
                                                <div className={cn("flex flex-col gap-0.5", isNum && "items-end")}>
                                                    <span
                                                        title={String(row[col])}
                                                        className={cn(!isNum && "truncate block w-full")}
                                                    >
                                                        {formatCellValue(row[col], col)}
                                                    </span>

                                                    {/* AI Assessment Chip for Rate Deviation */}
                                                    {col === "Rate Deviation" && row["AI Assessment"] && (
                                                        <span className={cn(
                                                            "text-[9px] px-1 rounded border uppercase tracking-wider mt-1",
                                                            row["Rate Deviation (%)"] > 15 ? "bg-orange-100 border-orange-300 text-orange-800" :
                                                                row["Rate Deviation (%)"] < -15 ? "bg-teal-100 border-teal-300 text-teal-800" : "bg-gray-50 border-gray-200 text-gray-500"
                                                        )}>
                                                            {row["AI Assessment"]}
                                                        </span>
                                                    )}

                                                    {showBadge && (
                                                        <div className="flex items-center gap-1 mt-0.5 select-none animate-in fade-in slide-in-from-top-1">
                                                            <div className={cn(
                                                                "flex items-center gap-0.5 text-[9px] font-bold px-1 py-0 rounded border",
                                                                row._frontendHighlightType === 'critical'
                                                                    ? "text-orange-700 bg-orange-50 border-orange-200"
                                                                    : "text-amber-700 bg-amber-50 border-amber-200"
                                                            )}>
                                                                {row._frontendHighlightType === 'critical' ? <ShieldAlert className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                                                                <span>{row._frontendAmountDiffPercent}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Detail Row */}
                                {expandedRows.has(row._rowId) && (
                                    <tr className="bg-gray-50/50">
                                        <td className="border-r border-gray-200"></td>
                                        <td colSpan={columns.length} className="px-4 py-3 border-b border-gray-200 shadow-inner">
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-0.5">
                                                    <Info className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Reasoning</p>
                                                        {row._frontendHighlightType === 'critical' && <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 rounded border border-orange-100">⚠️ Significant Deviation</span>}
                                                        {row._frontendHighlightType === 'success' && Math.abs(row._frontendAmountDiffPercent) > 15 && <span className="text-[10px] text-teal-600 font-medium bg-teal-50 px-1.5 rounded border border-teal-100">💰 Potential Savings</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-800 leading-relaxed font-medium bg-white p-2.5 rounded border border-gray-200 shadow-sm max-w-4xl">
                                                        {row._reasoningText}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Minimal Footer */}
            <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[10px] text-gray-500">
                <span>Showing {filteredData.length} records</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500 opacity-25"></div> Ref Missing</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500 opacity-10"></div> Calc Error</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Critical {'>'}15%</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Moderate 0-15%</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-500"></div> Savings</span>
                </div>
            </div>
        </div>
    );
}
