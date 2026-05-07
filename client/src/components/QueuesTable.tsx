import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Layers, ArrowUp, ArrowDown, ArrowUpDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';

interface Queue {
    name: string;
    vhost: string;
    type: string;
    durable: boolean;
    auto_delete: boolean;
    exclusive: boolean;
    arguments: Record<string, any>;
    state: string;
    consumers: number;
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
    idle_since?: string;
    message_stats?: {
        publish_details?: { rate: number };
        deliver_get_details?: { rate: number };
    };
}

const API_ROOT = '/api/proxy';
interface DashboardContext { refreshInterval: number; }

export const QueuesTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();
    const { selectedCluster } = useClusterStore();
    const [filter, setFilter] = useState('');
    const [selectedVhost, setSelectedVhost] = useState('all');

    const { data: queues = [], isLoading, error } = useQuery({
        queryKey: ['queues', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/queues`);
            return res.data as Queue[];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredQueues = queues.filter(q =>
        (selectedVhost === 'all' || q.vhost === selectedVhost) &&
        q.name.toLowerCase().includes(filter.toLowerCase())
    );

    const uniqueVhosts = Array.from(new Set(queues.map(q => q.vhost))).sort();
    const { items: sortedQueues, requestSort, sortConfig } = useSortableData(filteredQueues);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key)
            return <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)', opacity: 0 }} className="group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={13} style={{ color: '#818CF8' }} />
            : <ArrowDown size={13} style={{ color: '#818CF8' }} />;
    };

    if (isLoading && queues.length === 0) return <TableLoader />;
    if (error) return <TableError message="Failed to fetch queues" />;

    return (
        <div className="space-y-4 h-full flex flex-col animate-fade-in-up">
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Layers size={18} style={{ color: '#818CF8' }} />
                    Queues
                    <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                    >
                        {queues.length}
                    </span>
                </h2>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedVhost}
                        onChange={e => setSelectedVhost(e.target.value)}
                        className="input-glass py-2 px-3 text-sm cursor-pointer"
                        style={{ minWidth: '120px' }}
                    >
                        <option value="all">All vhosts</option>
                        {uniqueVhosts.map(vh => <option key={vh} value={vh}>{vh}</option>)}
                    </select>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search queues…"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="input-glass py-2 pl-9 pr-4 text-sm w-56"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div
                className="flex-1 rounded-2xl flex flex-col min-h-0 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}
            >
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left table-glass">
                        <thead>
                            <tr>
                                {[
                                    { key: 'name', label: 'Name', align: 'left' },
                                    { key: 'features', label: 'Features', align: 'left', noSort: true },
                                    { key: 'state', label: 'State', align: 'left' },
                                    { key: 'consumers', label: 'Consumers', align: 'right' },
                                    { key: 'messages_ready', label: 'Ready', align: 'right' },
                                    { key: 'messages_unacknowledged', label: 'Unacked', align: 'right' },
                                    { key: 'messages', label: 'Total', align: 'right' },
                                    { key: 'message_stats.publish_details.rate', label: 'Publish', align: 'right' },
                                    { key: 'message_stats.deliver_get_details.rate', label: 'Deliver', align: 'right' },
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider group ${!col.noSort ? 'cursor-pointer select-none' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                        style={{ color: 'var(--color-text-muted)' }}
                                        onClick={() => !col.noSort && requestSort(col.key)}
                                    >
                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                            {col.label}
                                            {!col.noSort && getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedQueues.map(q => (
                                <tr key={q.name}>
                                    <td className="px-5 py-3.5">
                                        <div 
                                            className="font-medium text-sm cursor-pointer hover:underline" 
                                            style={{ color: '#818CF8' }}
                                            onClick={() => navigate(`/cluster/${selectedCluster}/queues/${encodeURIComponent(q.vhost)}/${encodeURIComponent(q.name)}`)}
                                        >
                                            {q.name}
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>vhost: {q.vhost}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1">
                                            {q.durable && <FeatureBadge label="D" title="Durable" color="rgba(99,102,241,0.15)" textColor="#818CF8" />}
                                            {q.auto_delete && <FeatureBadge label="AD" title="Auto-Delete" color="rgba(245,158,11,0.12)" textColor="#FBB F24" />}
                                            {q.exclusive && <FeatureBadge label="Ex" title="Exclusive" color="rgba(139,92,246,0.12)" textColor="#A78BFA" />}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <StateBadge state={q.state} idleSince={q.idle_since} />
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        {q.consumers}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm font-semibold" style={{ color: '#818CF8' }}>
                                        {q.messages_ready}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm font-semibold" style={{ color: '#FCD34D' }}>
                                        {q.messages_unacknowledged}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                        {q.messages}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#60A5FA' }}>
                                            <ArrowRight size={11} />
                                            {q.message_stats?.publish_details?.rate?.toFixed(1) || '0.0'}/s
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#34D399' }}>
                                            <ArrowLeft size={11} />
                                            {q.message_stats?.deliver_get_details?.rate?.toFixed(1) || '0.0'}/s
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredQueues.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-5 py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        No queues found matching your search.
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

// ─── Shared Sub-components ───────────────────────────────────────────────────

export const TableLoader: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
            <div
                className="w-10 h-10 rounded-full animate-spin"
                style={{
                    background: 'conic-gradient(from 0deg, rgba(99,102,241,0.8), transparent)',
                    mask: 'radial-gradient(circle at center, transparent 40%, black 40%)',
                }}
            />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        </div>
    </div>
);

export const TableError: React.FC<{ message: string }> = ({ message }) => (
    <div
        className="p-6 rounded-2xl text-sm"
        style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#F87171',
        }}
    >
        {message}
    </div>
);

export const StateBadge: React.FC<{ state: string; idleSince?: string }> = ({ state, idleSince }) => {
    const isRunning = state === 'running' && !idleSince;
    return (
        <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={isRunning ? {
                background: 'rgba(16,185,129,0.12)',
                color: '#34D399',
                border: '1px solid rgba(16,185,129,0.2)',
            } : {
                background: 'rgba(245,158,11,0.12)',
                color: '#FCD34D',
                border: '1px solid rgba(245,158,11,0.2)',
            }}
        >
            {idleSince ? 'idle' : state}
        </span>
    );
};

const FeatureBadge: React.FC<{ label: string; title: string; color: string; textColor: string }> = ({ label, title, color, textColor }) => (
    <span
        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold cursor-help"
        style={{ background: color, color: textColor }}
        title={title}
    >
        {label}
    </span>
);
