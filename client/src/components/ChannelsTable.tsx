import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, Radio, ArrowUpRight, ArrowDownLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';
import { TableLoader, TableError, StateBadge } from './QueuesTable';

interface Channel {
    name: string;
    vhost: string;
    user: string;
    number: number;
    node: string;
    connection_details: { name: string; peer_host: string; peer_port: number; };
    state: string;
    confirm: boolean;
    transactional: boolean;
    consumer_count: number;
    messages_unacknowledged: number;
    messages_unconfirmed: number;
    idle_since?: string;
    prefetch_count: number;
    message_stats?: {
        publish_details?: { rate: number };
        deliver_get_details?: { rate: number };
    };
}

const API_ROOT = '/api/proxy';
interface DashboardContext { refreshInterval: number; }

export const ChannelsTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [filter, setFilter] = useState('');

    const { data: channels = [], isLoading, error } = useQuery({
        queryKey: ['channels', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/channels`);
            return res.data as Channel[];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredChannels = channels.filter(ch =>
        ch.name.toLowerCase().includes(filter.toLowerCase()) ||
        ch.user.toLowerCase().includes(filter.toLowerCase()) ||
        ch.connection_details?.name.toLowerCase().includes(filter.toLowerCase())
    );
    const { items: sortedChannels, requestSort, sortConfig } = useSortableData(filteredChannels);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key)
            return <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)', opacity: 0 }} className="group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={13} style={{ color: '#818CF8' }} />
            : <ArrowDown size={13} style={{ color: '#818CF8' }} />;
    };

    if (isLoading && channels.length === 0) return <TableLoader />;
    if (error) return <TableError message="Failed to fetch channels" />;

    return (
        <div className="space-y-4 h-full flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Radio size={18} style={{ color: '#818CF8' }} />
                    Channels
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                        {channels.length}
                    </span>
                </h2>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input type="text" placeholder="Search channels…" value={filter} onChange={e => setFilter(e.target.value)} className="input-glass py-2 pl-9 pr-4 text-sm w-56" />
                </div>
            </div>

            <div className="flex-1 rounded-2xl flex flex-col min-h-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left table-glass">
                        <thead>
                            <tr>
                                {[
                                    { key: 'name', label: 'Channel / Connection', align: 'left' },
                                    { key: 'user', label: 'User', align: 'left' },
                                    { key: 'state', label: 'State', align: 'left' },
                                    { key: 'mode', label: 'Mode', align: 'left', noSort: true },
                                    { key: 'prefetch_count', label: 'Prefetch', align: 'right' },
                                    { key: 'messages_unacknowledged', label: 'Unacked', align: 'right' },
                                    { key: 'message_stats.publish_details.rate', label: 'Pub / Del', align: 'right' },
                                ].map(col => (
                                    <th key={col.key} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider group ${!col.noSort ? 'cursor-pointer select-none' : ''} ${col.align === 'right' ? 'text-right' : ''}`} style={{ color: 'var(--color-text-muted)' }} onClick={() => !col.noSort && requestSort(col.key)}>
                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                            {col.label}{!col.noSort && getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedChannels.map(ch => (
                                <tr key={ch.name}>
                                    <td className="px-5 py-3.5">
                                        <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }} title={ch.name}>{ch.name}</div>
                                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ch.connection_details?.name}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ch.user}</td>
                                    <td className="px-5 py-3.5"><StateBadge state={ch.state} idleSince={ch.idle_since} /></td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            {ch.confirm && <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}>Confirm</span>}
                                            {ch.transactional && <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>Tx</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ch.prefetch_count}</td>
                                    <td className="px-5 py-3.5 text-right tabular-nums">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-sm font-medium" style={{ color: ch.messages_unacknowledged > 0 ? '#FCD34D' : 'var(--color-text-muted)' }}>
                                                {ch.messages_unacknowledged}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ch.messages_unconfirmed} unconf</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#60A5FA' }}>
                                                <ArrowUpRight size={11} />{ch.message_stats?.publish_details?.rate?.toFixed(1) || '0.0'}/s
                                            </div>
                                            <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#34D399' }}>
                                                <ArrowDownLeft size={11} />{ch.message_stats?.deliver_get_details?.rate?.toFixed(1) || '0.0'}/s
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredChannels.length === 0 && (
                                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No channels found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
