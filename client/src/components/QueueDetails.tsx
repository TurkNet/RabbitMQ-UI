import React, { useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useClusterStore } from '../store/useClusterStore';
import { ArrowLeft, Activity, Users, Box, Cpu } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TableLoader, TableError, StateBadge } from './QueuesTable';

const API_ROOT = '/api/proxy';

interface DashboardContext { refreshInterval: number; chartAge: number; }

export const QueueDetails: React.FC = () => {
  const { vhost, queueName } = useParams<{ vhost: string; queueName: string }>();
  const navigate = useNavigate();
  const { selectedCluster } = useClusterStore();
  const { refreshInterval, chartAge } = useOutletContext<DashboardContext>();

  const encodedVhost = encodeURIComponent(vhost || '');
  const encodedQueue = encodeURIComponent(queueName || '');

  // Fetch Queue Details including historical data (samples)
  const { data: queue, isLoading: isLoadingQueue, error: queueError } = useQuery({
    queryKey: ['queueDetails', selectedCluster, vhost, queueName, chartAge],
    queryFn: async () => {
      if (!selectedCluster || !vhost || !queueName) return null;
      // Get detailed stats with message rates and lengths over time (e.g. 60 samples)
      const res = await axios.get(
        `${API_ROOT}/${selectedCluster}/api/queues/${encodedVhost}/${encodedQueue}?lengths_age=${chartAge}&lengths_incr=10&msg_rates_age=${chartAge}&msg_rates_incr=10`
      );
      return res.data;
    },
    enabled: !!selectedCluster && !!vhost && !!queueName,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  // Fetch Consumers for this vhost and filter for this queue
  const { data: consumers = [], isLoading: isLoadingConsumers } = useQuery({
    queryKey: ['queueConsumers', selectedCluster, vhost, queueName],
    queryFn: async () => {
      if (!selectedCluster || !vhost) return [];
      const res = await axios.get(`${API_ROOT}/${selectedCluster}/api/consumers/${encodedVhost}`);
      // Filter consumers belonging to this queue
      return (res.data as any[]).filter(c => c.queue.name === queueName);
    },
    enabled: !!selectedCluster && !!vhost && !!queueName,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  // Prepare chart data from RabbitMQ samples
  const chartData = useMemo(() => {
    if (!queue || !queue.messages_details || !queue.messages_details.samples) return [];
    
    // RabbitMQ returns samples array like: [{ sample: count, timestamp: ts }, ...]
    // They are usually ordered from newest to oldest, we should reverse to oldest to newest.
    const samples = [...queue.messages_details.samples].reverse();
    const readySamples = queue.messages_ready_details?.samples ? [...queue.messages_ready_details.samples].reverse() : [];
    const unackedSamples = queue.messages_unacknowledged_details?.samples ? [...queue.messages_unacknowledged_details.samples].reverse() : [];

    return samples.map((s: any, index: number) => {
      const date = new Date(s.timestamp);
      return {
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`,
        Total: s.sample,
        Ready: readySamples[index]?.sample || 0,
        Unacked: unackedSamples[index]?.sample || 0,
      };
    });
  }, [queue]);

  if (isLoadingQueue) return <TableLoader />;
  if (queueError || !queue) return <TableError message="Failed to load queue details." />;

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in-up overflow-y-auto pr-2 pb-4">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(`/cluster/${selectedCluster}/queues`)}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            {queue.name}
            <StateBadge state={queue.state} idleSince={queue.idle_since} />
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            vhost: <span className="font-semibold text-indigo-400">{queue.vhost}</span>
            <span className="opacity-50">|</span>
            type: <span className="font-semibold">{queue.type}</span>
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatCard title="Total Messages" value={queue.messages} icon={<Box size={20} />} color="#818CF8" />
        <StatCard title="Messages Ready" value={queue.messages_ready} icon={<Activity size={20} />} color="#34D399" />
        <StatCard title="Unacknowledged" value={queue.messages_unacknowledged} icon={<Activity size={20} />} color="#FCD34D" />
        <StatCard title="Memory Used" value={formatBytes(queue.memory)} icon={<Cpu size={20} />} color="#F87171" />
      </div>

      {/* Chart Section */}
      {chartData.length > 0 ? (
        <div className="glass p-5 rounded-2xl shrink-0" style={{ minHeight: '300px' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>Message History</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--color-text-muted)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={30}
                />
                <YAxis 
                  stroke="var(--color-text-muted)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '8px', 
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Total" stroke="#818CF8" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Ready" stroke="#34D399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Unacked" stroke="#FCD34D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass p-5 rounded-2xl flex items-center justify-center shrink-0 h-64 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No historical data available. Enable message rates in RabbitMQ to see graphs.
        </div>
      )}

      {/* Consumers Table */}
      <div className="flex-1 min-h-0 flex flex-col space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Users size={18} style={{ color: '#818CF8' }} />
          Assigned Consumers
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
            {consumers.length}
          </span>
        </h3>
        
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
          <div className="flex-1 overflow-auto">
            {isLoadingConsumers ? (
              <TableLoader />
            ) : (
              <table className="w-full text-sm text-left table-glass">
                <thead className="sticky top-0 z-10" style={{ background: 'var(--color-bg-base)' }}>
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Consumer Tag</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>Channel / Connection</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>Prefetch Count</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--color-text-muted)' }}>Ack Required</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--color-text-muted)' }}>Exclusive</th>
                  </tr>
                </thead>
                <tbody>
                  {consumers.map((c: any) => (
                    <tr key={c.consumer_tag}>
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }} title={c.consumer_tag}>
                          {c.consumer_tag}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium" style={{ color: '#818CF8' }}>{c.channel_details?.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{c.channel_details?.connection_name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {c.prefetch_count}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.ack_required ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {c.ack_required ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.exclusive ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {c.exclusive ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {consumers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No consumers assigned to this queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Shared Sub-components ───────────────────────────────────────────────────

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="glass p-4 rounded-2xl flex items-center gap-4">
    <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ background: `var(--color-bg-base)`, color: color }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium uppercase tracking-wider mb-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      <div className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  </div>
);

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
