'use client';
import { StudentAuthProvider, useStudentAuth } from '@/hooks/useStudentAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';

function StudentAuthGate({ children }) {
  const { isAuthenticated, checking } = useStudentAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if on login page or still checking
    if (checking) return;
    if (!isAuthenticated && !pathname.startsWith('/s/login')) {
      router.replace('/s/login');
    }
  }, [checking, isAuthenticated, pathname, router]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Spinner size={32} />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  // Allow login page without auth
  if (!isAuthenticated && pathname.startsWith('/s/login')) {
    return children;
  }

  if (!isAuthenticated) return null;
  return children;
}

function StudentShell({ children }) {
  const { studentName, logout } = useStudentAuth();
  const pathname = usePathname();

  // Don't show shell on login page
  if (pathname.startsWith('/s/login')) return children;

  const tabs = [
    { key: '/s/results', label: '📊 Results' },
    { key: '/s/my-tests', label: '📋 My Tests' },
  ];

  return (
    <>
      {/* Header - matches the existing dashboard.html style */}
      <header 
        className="text-white sticky top-0 z-50"
        style={{ 
          background: 'linear-gradient(135deg, #3d6b5e 0%, #2d5a50 50%, #1a4a42 100%)' 
        }}
      >
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Score Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-sm">{studentName}</span>
            <button
              onClick={logout}
              className="text-white/60 hover:text-white text-sm transition border border-white/30 rounded-md px-3 py-1.5 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-[60px] z-40">
        <div className="max-w-3xl mx-auto flex">
          {tabs.map(tab => {
            const isActive = pathname === tab.key;
            return (
              <a
                key={tab.key}
                href={tab.key}
                className={`flex-1 text-center py-3.5 text-sm font-semibold transition-colors border-b-[3px] ${
                  isActive 
                    ? 'text-[#4a8b7f] border-[#4a8b7f]' 
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main 
        className="min-h-screen"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(74, 139, 127, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(0, 137, 123, 0.10) 0%, transparent 50%),
            linear-gradient(165deg, #e6f2ef 0%, #f0f7f5 30%, #f8faf9 60%, #f5f9f8 100%)
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="max-w-3xl mx-auto px-5 py-6">
          {children}
        </div>
      </main>
    </>
  );
}

export default function StudentLayout({ children }) {
  return (
    <StudentAuthProvider>
      <StudentAuthGate>
        <StudentShell>
          {children}
        </StudentShell>
      </StudentAuthGate>
    </StudentAuthProvider>
  );
}
