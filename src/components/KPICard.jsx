import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export function KPICard({ icon: Icon, label, value, subtitle, color = "blue", delay = 0 }) {
    const colorClasses = {
        blue: {
            icon: "text-blue-600",
            bg: "bg-blue-50"
        },
        green: {
            icon: "text-green-600",
            bg: "bg-green-50"
        },
        amber: {
            icon: "text-amber-600",
            bg: "bg-amber-50"
        },
        red: {
            icon: "text-red-600",
            bg: "bg-red-50"
        }
    };

    const theme = colorClasses[color] || colorClasses.blue;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay }} // Subtle animation
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-md", theme.bg)}>
                    <Icon className={cn("w-4 h-4", theme.icon)} />
                </div>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</span>
            </div>

            <div className="text-2xl font-semibold text-gray-900 mb-1">
                {value}
            </div>

            {subtitle && (
                <div className="text-xs text-gray-500">
                    {subtitle}
                </div>
            )}
        </motion.div>
    );
}
