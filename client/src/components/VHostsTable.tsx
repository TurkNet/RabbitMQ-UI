import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Globe, ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';

interface VHost {
    name: string;
    description?: string;
    tags?: string[];
    tracing: boolean;
    messages?: number;
    messages_ready?: number;
    messages_unacknowledged?: number;
}

const API_ROOT = '/api/proxy';

interface DashboardContext {
    refreshInterval: number;
}

export const VHostsTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [globalFilter, setGlobalFilter] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});

    const { data: vhosts = [], isLoading, error } = useQuery({
        queryKey: ['vhosts', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/vhosts`);
            if (Array.isArray(res.data)) {
                return res.data as VHost[];
            }
            return [];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredVHosts = vhosts.filter(v => {
        const tracingStr = v.tracing ? 'Enabled' : 'Disabled';
        
        const matchesGlobal = v.name.toLowerCase().includes(globalFilter.toLowerCase()); // Simple global search on name only for now as before? 
        // Original was: v.name.toLowerCase().includes(filter.toLowerCase())
        
        const matchesName = !filters.name || v.name.toLowerCase().includes(filters.name.toLowerCase());
        const matchesTracing = !filters.tracing || tracingStr.toLowerCase().includes(filters.tracing.toLowerCase());

        return matchesGlobal && matchesName && matchesTracing;
    });

    const { items: sortedVHosts, requestSort, sortConfig } = useSortableData(filteredVHosts);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="text-zinc-400 opacity-0 group-hover:opacity-50 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-indigo-500" />
            : <ArrowDown size={14} className="text-indigo-500" />;
    };

    if (isLoading && vhosts.length === 0) {
        return <div className="flex justify-center p-12 text-zinc-500">Loading vhosts...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Failed to fetch vhosts</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Globe size={20} className="text-indigo-500" />
                    Virtual Hosts ({vhosts.length})
                </h2>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Search vhosts..." 
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-700 dark:text-zinc-200"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 flex-1 flex flex-col min-h-0 overflow-hidden transition-colors">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-200 font-medium border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-10 shadow-sm transition-all">
                            <tr>
                                <th className="px-6 py-3 align-top">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between group">
                                            <div 
                                                className="flex items-center gap-1 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-100"
                                                onClick={() => requestSort('name')}
                                            >
                                                Name
                                                {getSortIcon('name')}
                                            </div>
                                            <button 
                                                onClick={() => setExpandedFilters(prev => ({ ...prev, name: !prev.name }))}
                                                className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors ${filters.name ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Filter size={14} />
                                            </button>
                                        </div>
                                        {(expandedFilters.name || filters.name) && (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Filter name..."
                                                value={filters.name || ''}
                                                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 align-top">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between group">
                                            <div 
                                                className="flex items-center gap-1 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-100"
                                                onClick={() => requestSort('tracing')}
                                            >
                                                Tracing
                                                {getSortIcon('tracing')}
                                            </div>
                                            <button 
                                                onClick={() => setExpandedFilters(prev => ({ ...prev, tracing: !prev.tracing }))}
                                                className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors ${filters.tracing ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Filter size={14} />
                                            </button>
                                        </div>
                                        {(expandedFilters.tracing || filters.tracing) && (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Filter tracing..."
                                                value={filters.tracing || ''}
                                                onChange={(e) => setFilters(prev => ({ ...prev, tracing: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 text-right cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                                    onClick={() => requestSort('messages')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Messages
                                        {getSortIcon('messages')}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 text-right cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                                    onClick={() => requestSort('messages_ready')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Ready
                                        {getSortIcon('messages_ready')}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 text-right cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                                    onClick={() => requestSort('messages_unacknowledged')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Unacked
                                        {getSortIcon('messages_unacknowledged')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                            {sortedVHosts.map((v) => (
                                <tr key={v.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-zinc-900 dark:text-white">
                                            {v.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${v.tracing ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600'}`}>
                                            {v.tracing ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-zinc-900 dark:text-white font-bold">
                                        {v.messages || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-indigo-600 dark:text-indigo-400 font-medium">
                                        {v.messages_ready || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                                        {v.messages_unacknowledged || 0}
                                    </td>
                                </tr>
                            ))}
                            {filteredVHosts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                                        No virtual hosts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
