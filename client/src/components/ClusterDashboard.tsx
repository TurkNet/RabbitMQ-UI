import React, { useState, useEffect } from 'react';
import { useClusterStore } from '../store/useClusterStore';
import { RefreshCw, Layers, Network, ChevronDown, Home, Radio, GitBranch, Circle } from 'lucide-react';
import { Outlet, NavLink, useParams } from 'react-router-dom';

export const ClusterDashboard: React.FC = () => {
    const { clusterName } = useParams<{ clusterName: string }>();
    const { selectCluster, selectedCluster } = useClusterStore();
    const [refreshInterval, setRefreshInterval] = useState<number>(5000);
    const [showRefreshMenu, setShowRefreshMenu] = useState(false);
    const [chartAge, setChartAge] = useState<number>(900); // Default 15 mins (900s)

    useEffect(() => {
        if (clusterName && clusterName !== selectedCluster) {
            selectCluster(clusterName);
        }
    }, [clusterName, selectedCluster, selectCluster]);

    if (!clusterName) {
        return (
            <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Select a cluster
            </div>
        );
    }

    const refreshOptions = [
        { label: 'Off', value: 0 },
        { label: '5s', value: 5000 },
        { label: '10s', value: 10000 },
        { label: '30s', value: 30000 },
        { label: '60s', value: 60000 },
    ];

    const chartAgeOptions = [
        { label: '15m', value: 900 },
        { label: '30m', value: 1800 },
        { label: '60m', value: 3600 },
    ];

    const navItems = [
        { path: '.', label: 'Overview', icon: <Home size={16} />, end: true },
        { path: 'connections', label: 'Connections', icon: <Network size={16} /> },
        { path: 'channels', label: 'Channels', icon: <Radio size={16} /> },
        { path: 'exchanges', label: 'Exchanges', icon: <GitBranch size={16} /> },
        { path: 'queues', label: 'Queues', icon: <Layers size={16} /> },
    ];

    return (
        <div
            className="flex-1 flex flex-col h-screen overflow-hidden"
            style={{ background: 'var(--color-bg-base)' }}
        >
            {/* ── Header ── */}
            <header
                className="px-6 py-4 flex items-center justify-between shrink-0"
                style={{
                    background: 'rgba(13,17,23,0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid var(--color-border)',
                }}
            >
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {clusterName}
                        </h1>
                    </div>
                    {/* Live badge */}
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            color: '#34D399',
                        }}
                    >
                        <Circle
                            size={6}
                            fill="#10B981"
                            stroke="none"
                            className="animate-pulse"
                        />
                        Live
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Chart Age Selector (Segmented Control) */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider ml-2 mr-1" style={{ color: 'var(--color-text-muted)' }}>Range</span>
                        {chartAgeOptions.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => setChartAge(opt.value)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                                style={{
                                    background: chartAge === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    color: chartAge === opt.value ? '#818CF8' : 'var(--color-text-muted)',
                                    border: chartAge === opt.value ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                    boxShadow: chartAge === opt.value ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                                }}
                                onMouseEnter={e => { if (chartAge !== opt.value) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                                onMouseLeave={e => { if (chartAge !== opt.value) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh control */}
                    <div className="relative">
                        <button
                            id="refresh-interval-btn"
                            onClick={() => setShowRefreshMenu(!showRefreshMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer h-[38px]"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            <RefreshCw
                                size={13}
                                style={{ color: '#818CF8' }}
                                className={refreshInterval > 0 ? 'animate-spin-slow' : ''}
                            />
                            <span style={{ color: 'var(--color-text-primary)' }}>
                                {refreshInterval === 0 ? 'Off' : `${refreshInterval / 1000}s`}
                            </span>
                            <ChevronDown size={13} style={{ color: 'var(--color-text-muted)' }} />
                        </button>

                        {showRefreshMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowRefreshMenu(false)} />
                                <div
                                    className="absolute right-0 mt-2 w-32 rounded-xl py-1 z-20 overflow-hidden"
                                    style={{
                                        background: 'rgba(13,17,23,0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid var(--color-border)',
                                        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    {refreshOptions.map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => { setRefreshInterval(opt.value); setShowRefreshMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-sm transition-all duration-150 cursor-pointer"
                                            style={{
                                                color: refreshInterval === opt.value
                                                    ? '#818CF8'
                                                    : 'var(--color-text-secondary)',
                                                fontWeight: refreshInterval === opt.value ? '600' : '400',
                                                background: 'transparent',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="p-5 flex flex-col flex-1 overflow-hidden gap-4">
                {/* Nav Bar */}
                <nav className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                    isActive ? 'nav-active' : 'nav-inactive'
                                }`
                            }
                            style={({ isActive }) => isActive ? {
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                                border: '1px solid rgba(99,102,241,0.3)',
                                color: '#C4B5FD',
                                boxShadow: '0 0 16px rgba(99,102,241,0.1)',
                            } : {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <Outlet context={{ refreshInterval, chartAge }} />
                </div>
            </main>
        </div>
    );
};
