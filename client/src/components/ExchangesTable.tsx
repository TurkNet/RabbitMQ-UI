import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { Search, GitBranch, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSortableData } from '../hooks/useSortableData';
import { TableLoader, TableError } from './QueuesTable';

interface Exchange {
    name: string;
    vhost: string;
    type: string;
    durable: boolean;
    auto_delete: boolean;
    internal: boolean;
    arguments: Record<string, any>;
    message_stats?: {
        publish_in_details?: { rate: number };
        publish_out_details?: { rate: number };
    };
}

const API_ROOT = '/api/proxy';
interface DashboardContext { refreshInterval: number; }

const EXCHANGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    direct:  { bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA' },
    topic:   { bg: 'rgba(139,92,246,0.12)',  color: '#A78BFA' },
    fanout:  { bg: 'rgba(249,115,22,0.12)',  color: '#FB923C' },
    headers: { bg: 'rgba(20,184,166,0.12)',  color: '#2DD4BF' },
    default: { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' },
};

export const ExchangesTable: React.FC = () => {
    const { refreshInterval } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();
    const [filter, setFilter] = useState('');

    const { data: exchanges = [], isLoading, error } = useQuery({
        queryKey: ['exchanges', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/exchanges`);
            return res.data as Exchange[];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const filteredExchanges = exchanges.filter(ex =>
        ex.name.toLowerCase().includes(filter.toLowerCase()) ||
        ex.type.toLowerCase().includes(filter.toLowerCase())
    );
    const { items: sortedExchanges, requestSort, sortConfig } = useSortableData(filteredExchanges);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key)
            return <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)', opacity: 0 }} className="group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={13} style={{ color: '#818CF8' }} />
            : <ArrowDown size={13} style={{ color: '#818CF8' }} />;
    };

    if (isLoading && exchanges.length === 0) return <TableLoader />;
    if (error) return <TableError message="Failed to fetch exchanges" />;

    return (
        <div className="space-y-4 h-full flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <GitBranch size={18} style={{ color: '#818CF8' }} />
                    Exchanges
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                        {exchanges.length}
                    </span>
                </h2>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input type="text" placeholder="Search exchanges…" value={filter} onChange={e => setFilter(e.target.value)} className="input-glass py-2 pl-9 pr-4 text-sm w-56" />
                </div>
            </div>

            <div className="flex-1 rounded-2xl flex flex-col min-h-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left table-glass">
                        <thead>
                            <tr>
                                {[
                                    { key: 'name', label: 'Name', align: 'left' },
                                    { key: 'type', label: 'Type', align: 'left' },
                                    { key: 'features', label: 'Features', align: 'left', noSort: true },
                                    { key: 'message_stats.publish_in_details.rate', label: 'Rate In', align: 'right' },
                                    { key: 'message_stats.publish_out_details.rate', label: 'Rate Out', align: 'right' },
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
                            {sortedExchanges.map(ex => {
                                const typeStyle = EXCHANGE_TYPE_COLORS[ex.type] || EXCHANGE_TYPE_COLORS.default;
                                return (
                                    <tr key={ex.name || 'amq.default'}>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-sm" style={{ color: ex.name ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                                                {ex.name || <span className="italic">(AMQP default)</span>}
                                            </div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>vhost: {ex.vhost}</div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                                                {ex.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1">
                                                {ex.durable && <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }} title="Durable">D</span>}
                                                {ex.auto_delete && <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }} title="Auto-Delete">AD</span>}
                                                {ex.internal && <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }} title="Internal">I</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#60A5FA' }}>
                                                <ArrowRight size={11} />{ex.message_stats?.publish_in_details?.rate?.toFixed(1) || '0.0'}/s
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color: '#34D399' }}>
                                                <ArrowLeft size={11} />{ex.message_stats?.publish_out_details?.rate?.toFixed(1) || '0.0'}/s
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredExchanges.length === 0 && (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No exchanges found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
