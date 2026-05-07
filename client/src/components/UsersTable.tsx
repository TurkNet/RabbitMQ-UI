import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Users, ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';

interface User {
    name: string;
    tags: string | string[];
    password_hash?: string;
}

interface Permission {
    user: string;
    vhost: string;
    configure: string;
    write: string;
    read: string;
}

const API_ROOT = '/api/proxy';

interface DashboardContext {
    refreshInterval: number;
}

export const UsersTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [globalFilter, setGlobalFilter] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});

    const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
        queryKey: ['users', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/users`);
            if (Array.isArray(res.data)) return res.data as User[];
            return [];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const { data: permissions = [] } = useQuery({
        queryKey: ['permissions', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/permissions`);
            if (Array.isArray(res.data)) return res.data as Permission[];
            return [];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredUsers = users.filter(u => {
        const tagsStr = Array.isArray(u.tags) ? u.tags.join(',') : (u.tags || '');
        const userPerms = permissions.filter(p => p.user === u.name);
        const accessStr = userPerms.map(p => p.vhost).join(', ');

        const matchesGlobal = u.name.toLowerCase().includes(globalFilter.toLowerCase()) || 
               tagsStr.toLowerCase().includes(globalFilter.toLowerCase());

        const matchesName = !filters.name || u.name.toLowerCase().includes(filters.name.toLowerCase());
        const matchesTags = !filters.tags || tagsStr.toLowerCase().includes(filters.tags.toLowerCase());
        const matchesAccess = !filters.access || accessStr.toLowerCase().includes(filters.access.toLowerCase());

        return matchesGlobal && matchesName && matchesTags && matchesAccess;
    });

    const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="text-zinc-400 opacity-0 group-hover:opacity-50 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-indigo-500" />
            : <ArrowDown size={14} className="text-indigo-500" />;
    };

    if (usersLoading && users.length === 0) {
        return <div className="flex justify-center p-12 text-zinc-500">Loading users...</div>;
    }

    if (usersError) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Failed to fetch data</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-indigo-500" />
                    Users ({users.length})
                </h2>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
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
                                                onClick={() => requestSort('tags')}
                                            >
                                                Tags
                                                {getSortIcon('tags')}
                                            </div>
                                            <button 
                                                onClick={() => setExpandedFilters(prev => ({ ...prev, tags: !prev.tags }))}
                                                className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors ${filters.tags ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Filter size={14} />
                                            </button>
                                        </div>
                                        {(expandedFilters.tags || filters.tags) && (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Filter tags..."
                                                value={filters.tags || ''}
                                                onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 align-top">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between group">
                                            <span className="font-medium">Can Access Virtual Hosts</span>
                                            <button 
                                                onClick={() => setExpandedFilters(prev => ({ ...prev, access: !prev.access }))}
                                                className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors ${filters.access ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Filter size={14} />
                                            </button>
                                        </div>
                                        {(expandedFilters.access || filters.access) && (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Filter vhost..."
                                                value={filters.access || ''}
                                                onChange={(e) => setFilters(prev => ({ ...prev, access: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                            {sortedUsers.map((u) => (
                                <tr key={u.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-zinc-900 dark:text-white">
                                            {u.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(Array.isArray(u.tags) ? u.tags : (u.tags ? u.tags.split(',') : [])).filter(t => t).map(tag => (
                                                <span key={tag} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-600">
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                            {(!u.tags || u.tags.length === 0) && <span className="text-zinc-400 italic text-xs">No tags</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {permissions.filter(p => p.user === u.name).map(p => (
                                                <span key={p.vhost} className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                                                    {p.vhost}
                                                </span>
                                            ))}
                                            {permissions.filter(p => p.user === u.name).length === 0 && (
                                                <span className="text-zinc-400 italic text-xs">No Access</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                                        No users found.
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
