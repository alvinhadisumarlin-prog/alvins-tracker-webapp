'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await login(password);
      router.replace('/');
    } catch (err) {
      setError(err.message || 'Invalid password');
    }
    setLoading(false);
  }

  return (
    <div className="login-bg">
      <div className="login-box">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          IB Score Tracker
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
          CIC Admin Dashboard
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 10, background: '#0f172a', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', marginTop: 12, transition: 'background 0.15s'
            }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
