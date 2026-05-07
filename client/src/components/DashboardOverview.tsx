import React, { useMemo } from 'react';
import { useClusterStore } from '../store/useClusterStore';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import {
    Activity, MessageSquare, HardDrive, AlertTriangle,
    Network, Layers, GitBranch, Radio, Users,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOutletContext } from 'react-router-dom';

const API_ROOT = '/api/proxy';

interface Overview {
    queue_totals: {
        messages: number;
        messages_ready: number;
        messages_unacknowledged: number;
        messages_details: { rate: number; samples?: { sample: number; timestamp: number }[] };
        messages_ready_details: { rate: number; samples?: { sample: number; timestamp: number }[] };
        messages_unacknowledged_details: { rate: number; samples?: { sample: number; timestamp: number }[] };
    };
    object_totals: {
        queues: number;
        exchanges: number;
        connections: number;
        channels: number;
        consumers: number;
    };
    message_stats?: {
        publish_details?: { rate: number; samples?: { sample: number; timestamp: number }[] };
        deliver_get_details?: { rate: number; samples?: { sample: number; timestamp: number }[] };
    };
    node: string;
}

interface Node {
    name: string;
    type: string;
    running: boolean;
    mem_used: number;
    mem_limit: number;
    disk_free: number;
    disk_free_limit: number;
    fd_used: number;
    fd_total: number;
    sockets_used: number;
    sockets_total: number;
    proc_used: number;
    proc_total: number;
}


interface DashboardContext { refreshInterval: number; chartAge: number; }

export const DashboardOverview: React.FC = () => {
    const { refreshInterval, chartAge } = useOutletContext<DashboardContext>();
    const { selectedCluster } = useClusterStore();

    const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
        queryKey: ['overview', selectedCluster, chartAge],
        queryFn: async () => {
            if (!selectedCluster) return null;
            // Get overview with selected history age
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/overview?lengths_age=${chartAge}&lengths_incr=10&msg_rates_age=${chartAge}&msg_rates_incr=10`);
            return res.data as Overview;
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const { data: nodes = [], isLoading: nodesLoading, error: nodesError } = useQuery({
        queryKey: ['nodes', selectedCluster],
        queryFn: async () => {
            if (!selectedCluster) return [];
            const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/nodes`);
            return res.data as Node[];
        },
        enabled: !!selectedCluster,
        refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    });

    const chartData = useMemo(() => {
        if (!overview || !overview.queue_totals?.messages_details?.samples) return [];

        const totalSamples = [...overview.queue_totals.messages_details.samples].reverse();
        const readySamples = overview.queue_totals.messages_ready_details?.samples ? [...overview.queue_totals.messages_ready_details.samples].reverse() : [];
        const unackedSamples = overview.queue_totals.messages_unacknowledged_details?.samples ? [...overview.queue_totals.messages_unacknowledged_details.samples].reverse() : [];
        const publishSamples = overview.message_stats?.publish_details?.samples ? [...overview.message_stats.publish_details.samples].reverse() : [];
        const deliverSamples = overview.message_stats?.deliver_get_details?.samples ? [...overview.message_stats.deliver_get_details.samples].reverse() : [];

        return totalSamples.map((s, index) => {
            const date = new Date(s.timestamp);
            return {
                time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`,
                total: s.sample,
                ready: readySamples[index]?.sample || 0,
                unacked: unackedSamples[index]?.sample || 0,
                publishRate: publishSamples[index]?.sample || 0,
                deliverRate: deliverSamples[index]?.sample || 0,
            };
        });
    }, [overview]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if ((overviewLoading || nodesLoading) && !overview && nodes.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 h-full">
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-full animate-spin"
                        style={{
                            background: 'conic-gradient(from 0deg, rgba(99,102,241,0.8), transparent)',
                            mask: 'radial-gradient(circle at center, transparent 40%, black 40%)',
                        }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading cluster data…</p>
                </div>
            </div>
        );
    }

    if (overviewError || nodesError) {
        return (
            <div
                className="flex flex-col items-center justify-center p-8 rounded-2xl"
                style={{
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.2)',
                }}
            >
                <AlertTriangle style={{ color: '#F87171' }} size={32} className="mb-3" />
                <p className="font-semibold" style={{ color: '#F87171' }}>Failed to fetch cluster data</p>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Messages',
            value: overview?.queue_totals?.messages ?? 0,
            icon: <MessageSquare size={18} />,
            color: '#6366F1',
            glow: 'rgba(99,102,241,0.3)',
        },
        {
            label: 'Ready',
            value: overview?.queue_totals?.messages_ready ?? 0,
            icon: <Activity size={18} />,
            color: '#10B981',
            glow: 'rgba(16,185,129,0.3)',
        },
        {
            label: 'Unacknowledged',
            value: overview?.queue_totals?.messages_unacknowledged ?? 0,
            icon: <AlertTriangle size={18} />,
            color: '#F59E0B',
            glow: 'rgba(245,158,11,0.3)',
        },
        {
            label: 'Queues',
            value: overview?.object_totals?.queues ?? 0,
            icon: <Layers size={18} />,
            color: '#8B5CF6',
            glow: 'rgba(139,92,246,0.3)',
        },
        {
            label: 'Connections',
            value: overview?.object_totals?.connections ?? 0,
            icon: <Network size={18} />,
            color: '#06B6D4',
            glow: 'rgba(6,182,212,0.3)',
        },
        {
            label: 'Exchanges',
            value: overview?.object_totals?.exchanges ?? 0,
            icon: <GitBranch size={18} />,
            color: '#EC4899',
            glow: 'rgba(236,72,153,0.3)',
        },
        {
            label: 'Channels',
            value: overview?.object_totals?.channels ?? 0,
            icon: <Radio size={18} />,
            color: '#F97316',
            glow: 'rgba(249,115,22,0.3)',
        },
        {
            label: 'Consumers',
            value: overview?.object_totals?.consumers ?? 0,
            icon: <Users size={18} />,
            color: '#14B8A6',
            glow: 'rgba(20,184,166,0.3)',
        },
    ];

    const tooltipStyle = {
        backgroundColor: 'rgba(13,17,23,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
    };

    return (
        <div className="space-y-5 h-full overflow-y-auto pr-1">

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {statCards.map((card, i) => (
                    <div
                        key={card.label}
                        className="rounded-xl p-4 flex flex-col gap-3 animate-fade-in-up transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--color-border)',
                            animationDelay: `${i * 40}ms`,
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(255,255,255,0.06)';
                            el.style.border = `1px solid ${card.glow.replace('0.3', '0.4')}`;
                            el.style.boxShadow = `0 0 20px ${card.glow}`;
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(255,255,255,0.03)';
                            el.style.border = '1px solid var(--color-border)';
                            el.style.boxShadow = 'none';
                        }}
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${card.color}18`, color: card.color }}
                        >
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                                {card.value.toLocaleString()}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {card.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Message Counts */}
                <div
                    className="rounded-2xl p-5 animate-fade-in-up stagger-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <MessageSquare size={16} style={{ color: '#6366F1' }} />
                            Message Counts
                        </h3>
                        <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#6366F1' }} />
                                Ready
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
                                Unacked
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                                Total
                            </span>
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}
                                    itemStyle={{ color: '#F1F5F9', fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="ready" stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }} name="Ready" />
                                <Line type="monotone" dataKey="unacked" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }} name="Unacked" />
                                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} name="Total" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Message Rates */}
                <div
                    className="rounded-2xl p-5 animate-fade-in-up stagger-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <Activity size={16} style={{ color: '#10B981' }} />
                            Message Rates
                            <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>ops/s</span>
                        </h3>
                        <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                                Publish: <strong style={{ color: '#34D399' }}>{overview?.message_stats?.publish_details?.rate?.toFixed(2) || '0.00'}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#06B6D4' }} />
                                Deliver: <strong style={{ color: '#22D3EE' }}>{overview?.message_stats?.deliver_get_details?.rate?.toFixed(2) || '0.00'}</strong>
                            </span>
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}
                                    itemStyle={{ color: '#F1F5F9', fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="publishRate" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} name="Publish" />
                                <Line type="monotone" dataKey="deliverRate" stroke="#06B6D4" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#06B6D4', strokeWidth: 0 }} name="Deliver" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Nodes ── */}
            <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    <HardDrive size={16} style={{ color: 'var(--color-text-muted)' }} />
                    Cluster Nodes
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {nodes.map((node, idx) => {
                        const memPercent = (node.mem_used / node.mem_limit) * 100;
                        const diskAlert = node.disk_free < node.disk_free_limit;
                        const memColor = memPercent > 90 ? '#EF4444' : memPercent > 70 ? '#F59E0B' : '#6366F1';

                        return (
                            <div
                                key={node.name}
                                className="rounded-2xl p-5 animate-fade-in-up"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${node.running ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)'}`,
                                    animationDelay: `${idx * 80}ms`,
                                }}
                            >
                                {/* Node Header */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: node.running
                                                    ? 'rgba(16,185,129,0.1)'
                                                    : 'rgba(239,68,68,0.1)',
                                            }}
                                        >
                                            <HardDrive
                                                size={20}
                                                style={{ color: node.running ? '#34D399' : '#F87171' }}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                                {node.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{
                                                        background: node.running ? '#10B981' : '#EF4444',
                                                        boxShadow: node.running
                                                            ? '0 0 6px rgba(16,185,129,0.8)'
                                                            : '0 0 6px rgba(239,68,68,0.8)',
                                                    }}
                                                />
                                                <span className="text-xs font-medium" style={{ color: node.running ? '#34D399' : '#F87171' }}>
                                                    {node.running ? 'Running' : 'Down'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {diskAlert && (
                                        <div
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.25)',
                                                color: '#F87171',
                                            }}
                                        >
                                            <AlertTriangle size={11} />
                                            Disk Alert
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {/* Memory */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span style={{ color: 'var(--color-text-muted)' }}>Memory Usage</span>
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                                    {formatBytes(node.mem_used)} / {formatBytes(node.mem_limit)}
                                                </span>
                                                <span
                                                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                                                    style={{ background: `${memColor}18`, color: memColor }}
                                                >
                                                    {node.mem_limit > 0 ? ((node.mem_used / node.mem_limit) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 progress-track">
                                            <div
                                                className="h-full progress-fill"
                                                style={{
                                                    width: `${Math.min(memPercent, 100)}%`,
                                                    background: `linear-gradient(90deg, ${memColor}99, ${memColor})`,
                                                    boxShadow: `0 0 8px ${memColor}66`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Disk */}
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--color-text-muted)' }}>Disk Free</span>
                                        <span style={{ color: diskAlert ? '#F87171' : 'var(--color-text-secondary)' }}>
                                            {formatBytes(node.disk_free)}
                                            <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>
                                                (limit: {formatBytes(node.disk_free_limit)})
                                            </span>
                                        </span>
                                    </div>

                                    {/* Grid Stats */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        {[
                                            { label: 'File Descriptors', used: node.fd_used, total: node.fd_total },
                                            { label: 'Sockets', used: node.sockets_used, total: node.sockets_total },
                                        ].map(stat => (
                                            <div
                                                key={stat.label}
                                                className="p-3 rounded-xl"
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid var(--color-border)',
                                                }}
                                            >
                                                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                                                <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                                                    {stat.used}
                                                    <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>/{stat.total}</span>
                                                    <span
                                                        className="text-xs ml-1.5 px-1.5 py-0.5 rounded font-normal"
                                                        style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}
                                                    >
                                                        {stat.total > 0 ? ((stat.used / stat.total) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
