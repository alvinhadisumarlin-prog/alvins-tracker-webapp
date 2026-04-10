'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import Spinner from '@/components/ui/Spinner';

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exchangeToken, isAuthenticated } = useStudentAuth();
  
  const [status, setStatus] = useState('processing'); // processing | error | no-token
  const [error, setError] = useState(null);

  useEffect(() => {
    // If already authenticated, redirect to results
    if (isAuthenticated) {
      router.replace('/s/results');
      return;
    }

    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('no-token');
      return;
    }

    // Exchange the login token for a session
    exchangeToken(token)
      .then(() => {
        router.replace('/s/results');
      })
      .catch(err => {
        setError(err.message || 'Login failed');
        setStatus('error');
      });
  }, [searchParams, exchangeToken, router, isAuthenticated]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size={40} />
        <p className="text-slate-600">Signing you in...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Login Failed</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-sm text-slate-500">
            Please request a new login link from the Telegram bot.
          </p>
        </div>
      </div>
    );
  }

  // no-token state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Student Dashboard</h1>
        <p className="text-slate-600 mb-6">
          To view your results, please use the login link from the Telegram bot.
        </p>
        <a
          href="https://t.me/AlvinsTrackerBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#3d6b5e] hover:bg-[#2d5a50] text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Open Telegram Bot
        </a>
      </div>
    </div>
  );
}
