import React, { useEffect, useState } from 'react';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Flag, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';

interface FeatureFlag {
    name: string;
    desc: string;
    doc_url: string;
    state: string;
    stability: string;
    provided_by: string;
}

const API_ROOT = '/api/proxy';

interface DashboardContext {
    refreshInterval: number;
}

export const FeatureFlagsTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');

    const fetchFlags = async () => {
        if (!selectedCluster) return;
        setLoading(flags.length === 0);
        try {
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/feature-flags`);
            if (Array.isArray(res.data)) {
                setFlags(res.data);
                setError('');
            } else {
                console.error('Unexpected feature flags response:', res.data);
                setError('Invalid feature flags response format');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch feature flags');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, [selectedCluster]);

    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchFlags, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [selectedCluster, refreshInterval]);

    const filteredFlags = flags.filter(f => 
        f.name.toLowerCase().includes(filter.toLowerCase()) ||
        f.desc.toLowerCase().includes(filter.toLowerCase())
    );

    const { items: sortedFlags, requestSort, sortConfig } = useSortableData(filteredFlags);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="text-zinc-400 opacity-0 group-hover:opacity-50 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-indigo-500" />
            : <ArrowDown size={14} className="text-indigo-500" />;
    };

    if (loading && flags.length === 0) {
        return <div className="flex justify-center p-12 text-zinc-500">Loading feature flags...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Flag size={20} className="text-indigo-500" />
                    Feature Flags ({flags.length})
                </h2>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Search flags..." 
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
                                <th className="px-6 py-3 cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors" onClick={() => requestSort('name')}>
                                    <div className="flex items-center gap-1">Name {getSortIcon('name')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer select-none group hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors" onClick={() => requestSort('state')}>
                                    <div className="flex items-center gap-1">State {getSortIcon('state')}</div>
                                </th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                            {sortedFlags.map((f) => (
                                <tr key={f.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{f.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${f.state === 'enabled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600'}`}>
                                            {f.state}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                        {f.desc}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {f.doc_url ? (
                                            <a href={f.doc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                                                Docs
                                                <ExternalLink size={14} />
                                            </a>
                                        ) : (
                                            <span className="text-zinc-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredFlags.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                                        No feature flags found.
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
