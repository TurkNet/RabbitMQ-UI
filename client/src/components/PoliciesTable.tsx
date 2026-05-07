import React, { useEffect, useState } from 'react';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, FileText, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';

interface Policy {
    vhost: string;
    name: string;
    pattern: string;
    'apply-to': string;
    definition: Record<string, any>;
    priority: number;
}

const API_ROOT = '/api/proxy';

interface DashboardContext {
    refreshInterval: number;
}

export const PoliciesTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');

    const fetchPolicies = async () => {
        if (!selectedCluster) return;
        setLoading(policies.length === 0);
        try {
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/policies`);
            if (Array.isArray(res.data)) {
                setPolicies(res.data);
                setError('');
            } else {
                console.error('Unexpected policies response:', res.data);
                setError('Invalid policies response format');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch policies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [selectedCluster]);

    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchPolicies, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [selectedCluster, refreshInterval]);

    const filteredPolicies = policies.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.pattern.toLowerCase().includes(filter.toLowerCase())
    );

    const { items: sortedPolicies, requestSort, sortConfig } = useSortableData(filteredPolicies);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="text-zinc-400 opacity-0 group-hover:opacity-50 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-indigo-500" />
            : <ArrowDown size={14} className="text-indigo-500" />;
    };

    if (loading && policies.length === 0) {
        return <div className="flex justify-center p-12 text-zinc-500">Loading policies...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileText size={20} className="text-indigo-500" />
                    Policies ({policies.length})
                </h2>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Search policies..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-700 dark:text-zinc-200"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 flex-1 flex flex-col min-h-0 overflow-hidden transition-colors">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-200 font-medium border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors" onClick={() => requestSort('vhost')}>
                                    <div className="flex items-center gap-1">VHost {getSortIcon('vhost')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors" onClick={() => requestSort('name')}>
                                    <div className="flex items-center gap-1">Name {getSortIcon('name')}</div>
                                </th>
                                <th className="px-6 py-3">Pattern</th>
                                <th className="px-6 py-3">Apply To</th>
                                <th className="px-6 py-3">Definition</th>
                                <th className="px-6 py-3 text-right cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors" onClick={() => requestSort('priority')}>
                                    <div className="flex items-center justify-end gap-1">Priority {getSortIcon('priority')}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                            {sortedPolicies.map((p) => (
                                <tr key={`${p.vhost}-${p.name}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{p.vhost}</td>
                                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">{p.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">{p.pattern}</td>
                                    <td className="px-6 py-4 capitalize text-zinc-700 dark:text-zinc-300">{p['apply-to']}</td>
                                    <td className="px-6 py-4">
                                        <code className="text-xs bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 block whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={JSON.stringify(p.definition, null, 2)}>
                                            {JSON.stringify(p.definition)}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{p.priority}</td>
                                </tr>
                            ))}
                            {filteredPolicies.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                                        No policies found.
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
