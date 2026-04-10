'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TRACKER_API = 'https://ipjolefhnzwthmalripz.supabase.co/functions/v1';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [session, setSession] = useState(null); // { token, studentName, studentId }
  const [checking, setChecking] = useState(true);

  const isAuthenticated = !!session?.token;

  // On mount, check for stored session
  useEffect(() => {
    const storedToken = localStorage.getItem('session_token');
    const storedName = localStorage.getItem('student_name');
    
    if (storedToken) {
      // Verify token is still valid by making a test request
      fetch(`${TRACKER_API}/get-my-results`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
        .then(res => {
          if (res.ok) {
            return res.json().then(data => {
              setSession({
                token: storedToken,
                studentName: data.student?.name || storedName || 'Student',
                studentId: data.student?.id
              });
              // Update cached name if we got a fresh one
              if (data.student?.name) {
                localStorage.setItem('student_name', data.student.name);
              }
            });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('session_token');
            localStorage.removeItem('student_name');
          }
        })
        .catch(() => {
          // Network error, but keep session if we have cached data
          if (storedToken && storedName) {
            setSession({ token: storedToken, studentName: storedName });
          }
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  // Exchange login token for session token
  const exchangeToken = useCallback(async (loginToken) => {
    const res = await fetch(`${TRACKER_API}/exchange-login-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: loginToken })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Invalid or expired login link');
    }
    
    // Store session
    const sessionToken = data.session_token;
    const studentName = data.student_name || 'Student';
    
    localStorage.setItem('session_token', sessionToken);
    localStorage.setItem('student_name', studentName);
    
    setSession({
      token: sessionToken,
      studentName: studentName,
      studentId: data.student_id
    });
    
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('student_name');
    setSession(null);
  }, []);

  return (
    <StudentAuthContext.Provider value={{ 
      session, 
      isAuthenticated, 
      checking, 
      exchangeToken, 
      logout,
      token: session?.token,
      studentName: session?.studentName 
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) throw new Error('useStudentAuth must be used within StudentAuthProvider');
  return context;
}
