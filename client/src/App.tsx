import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from "./components/Sidebar";
import { ClusterDashboard } from "./components/ClusterDashboard";
import { DashboardOverview } from "./components/DashboardOverview";
import { ConnectionsTable } from "./components/ConnectionsTable";
import { ChannelsTable } from "./components/ChannelsTable";
import { ExchangesTable } from "./components/ExchangesTable";
import { QueuesTable } from './components/QueuesTable';
import { QueueDetails } from './components/QueueDetails';
import { useThemeStore } from './store/useThemeStore';
import { useClusterStore } from './store/useClusterStore';
import { RouteTracker } from './components/RouteTracker';
import { Server } from 'lucide-react';

function App() {
  const { isDarkMode } = useThemeStore();
  const { fetchConfig } = useClusterStore();

  useEffect(() => {
    fetchConfig();
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, fetchConfig]);

  return (
    <BrowserRouter>
      <RouteTracker />
      <div className="flex h-screen font-sans overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
        <Sidebar />
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route path="/cluster/:clusterName" element={<ClusterDashboard />}>
            <Route index element={<DashboardOverview />} />
            <Route path="connections" element={<ConnectionsTable />} />
            <Route path="channels" element={<ChannelsTable />} />
            <Route path="exchanges" element={<ExchangesTable />} />
            <Route path="queues" element={<QueuesTable />} />
            <Route path="queues/:vhost/:queueName" element={<QueueDetails />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient gradient blobs */}
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          top: '20%',
          left: '30%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          bottom: '20%',
          right: '30%',
          transform: 'translate(50%, 50%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            background: i % 2 === 0 ? 'rgba(99,102,241,0.4)' : 'rgba(16,185,129,0.3)',
            top: `${20 + i * 12}%`,
            left: `${10 + i * 14}%`,
            animation: `particle-float ${3 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Main Content */}
      <div className="relative flex flex-col items-center gap-8 animate-fade-in-up">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            boxShadow: '0 0 40px rgba(99,102,241,0.2)',
          }}
        >
          <Server size={40} style={{ color: '#818CF8' }} />
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold gradient-text">
            RabbitMQ Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }} className="text-base">
            Bir cluster seçerek izlemeye başlayın
          </p>
        </div>

        {/* Hint */}
        <div
          className="glass px-5 py-3 rounded-xl flex items-center gap-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-sm">Sol panelden bir cluster seçin</span>
        </div>
      </div>
    </div>
  );
}

export default App;
