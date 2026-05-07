import React, { useEffect, useState } from 'react';
import { useClusterStore } from '../store/useClusterStore';
import { useThemeStore } from '../store/useThemeStore';
import { Server, LogOut, ChevronRight, Lock, Unlock, Plus, Trash2, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
    const { 
        clusters, fetchClusters, lastVisitedPages, selectCluster, 
        adminEnabled, isAuthenticated, login, logout, addCluster, removeCluster 
    } = useClusterStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();

    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [password, setPassword] = useState('');
    const [newCluster, setNewCluster] = useState({ name: '', url: '', username: '', password: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchClusters();
    }, [fetchClusters]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(password);
            setShowLoginModal(false);
            setPassword('');
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    const handleAddCluster = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCluster(newCluster);
            setShowAddModal(false);
            setNewCluster({ name: '', url: '', username: '', password: '' });
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add cluster');
        }
    };

    return (
        <div
            className="w-72 h-screen flex flex-col z-20 shrink-0"
            style={{
                background: 'linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg-base) 100%)',
                borderRight: '1px solid var(--color-border)',
            }}
        >
            {/* ── Header ── */}
            <div
                className="px-5 py-5 flex items-center justify-between shrink-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
                    >
                        <img
                            src="/turknet-logo.svg"
                            alt="Logo"
                            className="h-4 w-auto object-contain"
                            style={{ filter: 'brightness(0) invert(1)' }}
                        />
                    </div>
                    <div>
                        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                            RabbitMQ
                        </p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Dashboard
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Cluster List ── */}
            <div className="flex-1 overflow-y-auto py-4 px-3">
                <div className="flex items-center justify-between px-2 mb-3">
                    <p
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Your Clusters
                    </p>
                    {isAuthenticated && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-1 rounded-md hover:bg-white/10 transition-colors"
                            style={{ color: '#818CF8' }}
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                <div className="space-y-1">
                    {clusters.map((cluster, idx) => {
                        const isSelected = location.pathname.startsWith('/cluster/' + cluster.name);
                        return (
                            <div
                                key={cluster.name}
                                className="group flex items-center justify-between rounded-xl transition-all duration-200 overflow-hidden cursor-pointer animate-fade-in-up"
                                style={{
                                    animationDelay: `${idx * 50}ms`,
                                    background: isSelected
                                        ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))'
                                        : 'transparent',
                                    border: isSelected
                                        ? '1px solid rgba(99,102,241,0.35)'
                                        : '1px solid transparent',
                                    boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        (e.currentTarget as HTMLElement).style.background = 'var(--overlay-white-5)';
                                        (e.currentTarget as HTMLElement).style.border = '1px solid var(--overlay-white-10)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                                    }
                                }}
                            >
                                <div
                                    className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0"
                                    onClick={() => {
                                        const subPath = lastVisitedPages[cluster.name] || '';
                                        navigate(`/cluster/${cluster.name}${subPath}`);
                                    }}
                                >
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{
                                            background: isSelected
                                                ? 'var(--color-primary-glow)'
                                                : 'var(--overlay-white-5)',
                                        }}
                                    >
                                        <Server
                                            size={14}
                                            style={{ color: isSelected ? '#818CF8' : 'var(--color-text-muted)' }}
                                        />
                                    </div>
                                    <span
                                        className="truncate text-sm font-medium"
                                        style={{
                                            color: isSelected ? '#C4B5FD' : 'var(--color-text-secondary)',
                                        }}
                                    >
                                        {cluster.name}
                                    </span>
                                </div>
                                {isAuthenticated && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Remove cluster ${cluster.name}?`)) {
                                                removeCluster(cluster.name);
                                            }
                                        }}
                                        className="px-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                {isSelected && !isAuthenticated && (
                                    <div className="px-3">
                                        <ChevronRight size={14} style={{ color: '#818CF8' }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {clusters.length === 0 && (
                        <div
                            className="mx-2 p-4 rounded-xl text-center"
                            style={{
                                background: 'var(--overlay-glass-bg)',
                                border: '1px dashed var(--overlay-white-10)',
                            }}
                        >
                            <Server size={20} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                No clusters found
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div
                className="p-3 space-y-2 shrink-0"
                style={{ borderTop: '1px solid var(--color-border)' }}
            >
                {location.pathname.startsWith('/cluster/') && (
                    <SidebarButton
                        id="sidebar-disconnect-btn"
                        icon={<LogOut size={15} />}
                        label="Disconnect"
                        variant="danger"
                        onClick={() => {
                            navigate('/');
                            setTimeout(() => selectCluster(null), 0);
                        }}
                    />
                )}
                
                {adminEnabled && (
                    <SidebarButton
                        id="sidebar-admin-btn"
                        icon={isAuthenticated ? <Unlock size={15} /> : <Lock size={15} />}
                        label={isAuthenticated ? 'Logout Admin' : 'Admin Login'}
                        variant={isAuthenticated ? 'primary' : 'ghost'}
                        onClick={isAuthenticated ? logout : () => setShowLoginModal(true)}
                    />
                )}

                <SidebarButton
                    id="sidebar-theme-btn"
                    icon={
                        <div className="w-3.5 h-3.5 rounded-full" style={{
                            background: isDarkMode
                                ? 'linear-gradient(135deg, #FDE68A, #F59E0B)'
                                : 'linear-gradient(135deg, #1E3A5F, #3B82F6)',
                        }} />
                    }
                    label={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    onClick={toggleTheme}
                />
            </div>

            {/* ── Login Modal ── */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold gradient-text">Admin Login</h3>
                                <button onClick={() => setShowLoginModal(false)} className="text-muted hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Admin Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Enter password..."
                                        autoFocus
                                    />
                                </div>
                                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-[0.98]"
                                >
                                    Login
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Cluster Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold gradient-text">Add New Cluster</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddCluster} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Cluster Name</label>
                                        <input
                                            type="text"
                                            value={newCluster.name}
                                            onChange={e => setNewCluster({ ...newCluster, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="Production"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Management URL</label>
                                        <input
                                            type="url"
                                            value={newCluster.url}
                                            onChange={e => setNewCluster({ ...newCluster, url: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="http://localhost:15672"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Username</label>
                                        <input
                                            type="text"
                                            value={newCluster.username}
                                            onChange={e => setNewCluster({ ...newCluster, username: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="guest"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Password</label>
                                        <input
                                            type="password"
                                            value={newCluster.password}
                                            onChange={e => setNewCluster({ ...newCluster, password: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-[0.98]"
                                >
                                    Add Cluster
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface SidebarButtonProps {
    id?: string;
    icon: React.ReactNode;
    label: string;
    variant?: 'ghost' | 'primary' | 'danger';
    onClick: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ id, icon, label, variant = 'ghost', onClick }) => {
    const styles: Record<string, React.CSSProperties> = {
        ghost: {
            background: 'var(--overlay-white-5)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
        },
        primary: {
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#C4B5FD',
        },
        danger: {
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#F87171',
        },
    };

    return (
        <button
            id={id}
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
            style={styles[variant]}
            onMouseEnter={e => {
                if (variant === 'ghost') {
                    (e.currentTarget as HTMLElement).style.background = 'var(--overlay-white-10)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                }
                if (variant === 'primary') {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(99,102,241,0.25)';
                }
                if (variant === 'danger') {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
                }
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = styles[variant].background as string;
                el.style.boxShadow = 'none';
                if (variant === 'ghost') el.style.color = styles[variant].color as string;
            }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};
