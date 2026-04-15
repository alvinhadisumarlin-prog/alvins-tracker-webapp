'use client';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { DataProvider, useData } from '@/hooks/useData';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';

function AuthGate({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!checking && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [checking, isAuthenticated, pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') return null;
  return children;
}

function AppShell({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const { loading, lastRefresh, refresh } = useData();
  const pathname = usePathname();

  if (pathname === '/login') return children;

  const tabs = [
    { key: '/', label: '📊 Dashboard' },
    { key: '/students', label: '👥 Students' },
    { key: '/tests', label: '📝 Tests' },
    { key: '/analysis', label: '🔬 Analysis' },
    { key: '/trends', label: '📈 Trends' },
    { key: '/review', label: '🔍 Review' },
    { key: '/synthetic', label: '🧪 Synthetic' },
  ];

  function formatTime(d) {
    return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(d) {
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  }

  return (
    <>
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">IB Score Tracker</h1>
            <p className="text-slate-400 text-xs">Alvin's Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-slate-500 text-xs">
                {formatDate(lastRefresh)} {formatTime(lastRefresh)}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition border-none cursor-pointer"
              style={{ fontFamily: 'inherit' }}
            >
              {loading ? <Spinner size={14} /> : '↻'} Refresh
            </button>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-slate-300 text-sm transition border-none bg-transparent cursor-pointer"
              title="Log out"
            >
              ⏻
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex gap-1 p-2 max-w-7xl mx-auto">
          {tabs.map(tab => (
            <a
              key={tab.key}
              href={tab.key}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition no-underline ${
                pathname === tab.key ? 'tab-active' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto fade-in">
        {loading && !lastRefresh ? (
          <div className="flex justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AuthGate>
        <DataProvider>
          <AppShell>
            {children}
          </AppShell>
        </DataProvider>
      </AuthGate>
    </AuthProvider>
  );
}
