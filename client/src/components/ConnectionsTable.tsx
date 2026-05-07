import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Monitor, Shield, Zap, Activity, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';
import { TableLoader, TableError, StateBadge } from './QueuesTable';

interface Connection {
    name: string;
    vhost: string;
    user: string;
    state: string;
    ssl: boolean;
    protocol: string;
    channels: number;
    recv_oct_details?: { rate: number };
    send_oct_details?: { rate: number };
    client_properties?: { product?: string; platform?: string; version?: string };
}

const API_ROOT = '/api/proxy';
interface DashboardContext { refreshInterval: number; }

export const ConnectionsTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [filter, setFilter] = useState('');

    const { data: connections = [], isLoading, error } = useQuery({
        queryKey: ['connections', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/connections`);
            return res.data as Connection[];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredConnections = connections.filter(conn =>
        conn.name.toLowerCase().includes(filter.toLowerCase()) ||
        conn.user.toLowerCase().includes(filter.toLowerCase())
    );
    const { items: sortedConnections, requestSort, sortConfig } = useSortableData(filteredConnections);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key)
            return <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)', opacity: 0 }} className="group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={13} style={{ color: '#818CF8' }} />
            : <ArrowDown size={13} style={{ color: '#818CF8' }} />;
    };

    if (isLoading && connections.length === 0) return <TableLoader />;
    if (error) return <TableError message="Failed to fetch connections" />;

    const cols = [
        { key: 'name', label: 'Name / User', align: 'left' },
        { key: 'client_properties.product', label: 'Client', align: 'left' },
        { key: 'state', label: 'State', align: 'left' },
        { key: 'protocol', label: 'Protocol', align: 'left', noSort: true },
        { key: 'channels', label: 'Channels', align: 'right' },
        { key: 'recv_oct_details.rate', label: 'From Client', align: 'right' },
        { key: 'send_oct_details.rate', label: 'To Client', align: 'right' },
    ];

    return (
        <div className="space-y-4 h-full flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Monitor size={18} style={{ color: '#818CF8' }} />
                    Connections
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                        {connections.length}
                    </span>
                </h2>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type="text" placeholder="Search connections…" value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="input-glass py-2 pl-9 pr-4 text-sm w-56"
                    />
                </div>
            </div>

            <div className="flex-1 rounded-2xl flex flex-col min-h-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left table-glass">
                        <thead>
                            <tr>
                                {cols.map(col => (
                                    <th key={col.key} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider group ${!col.noSort ? 'cursor-pointer select-none' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text-muted)' }} onClick={() => !col.noSort && requestSort(col.key)}>
                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                            {col.label}{!col.noSort && getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedConnections.map(conn => (
                                <tr key={conn.name}>
                                    <td className="px-5 py-3.5">
                                        <div className="font-medium text-sm truncate max-w-[220px]" style={{ color: 'var(--color-text-primary)' }} title={conn.name}>{conn.name}</div>
                                        <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                            <span>{conn.user}</span>
                                            <span>•</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.05)' }}>{conn.vhost}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{conn.client_properties?.product || 'Unknown'}</div>
                                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{conn.client_properties?.platform || '-'}</div>
                                    </td>
                                    <td className="px-5 py-3.5"><StateBadge state={conn.state} /></td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {conn.protocol}
                                            {conn.ssl && <Shield size={13} style={{ color: '#34D399' }} />}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>{conn.channels}</td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#34D399' }}>
                                            <Zap size={11} className="rotate-180" />
                                            {conn.recv_oct_details?.rate?.toFixed(1) || '0.0'}/s
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#60A5FA' }}>
                                            <Activity size={11} />
                                            {conn.send_oct_details?.rate?.toFixed(1) || '0.0'}/s
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredConnections.length === 0 && (
                                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No connections found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
