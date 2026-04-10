'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);

  const isAuthenticated = !!token;

  // On mount, check for stored token
  useEffect(() => {
    const stored = localStorage.getItem('cic_token');
    if (stored) {
      // Verify with server
      fetch('/api/auth', {
        headers: { 'Authorization': 'Bearer ' + stored }
      })
        .then(res => {
          if (res.ok) {
            setToken(stored);
          } else {
            localStorage.removeItem('cic_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('cic_token');
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const login = useCallback(async (password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid password');
    localStorage.setItem('cic_token', data.token);
    setToken(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cic_token');
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
