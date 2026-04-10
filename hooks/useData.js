'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchAllData } from '@/lib/queries';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [testAssignments, setTestAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllData();
      setStudents(data.students);
      setTests(data.tests);
      setResults(data.results);
      setTestAssignments(data.testAssignments);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to connect to Supabase');
    }
    setLoading(false);
  }, []);

  // Update a single test in local state (for optimistic updates)
  const updateTest = useCallback((testId, updater) => {
    setTests(prev => prev.map(t =>
      t.id === testId ? (typeof updater === 'function' ? updater(t) : { ...t, ...updater }) : t
    ));
  }, []);

  // Update local testAssignments after a mutation (optimistic update)
  const updateAssignment = useCallback((testId, classCode, updater) => {
    setTestAssignments(prev => {
      const idx = prev.findIndex(ta => ta.test_id === testId && ta.class_code === classCode);
      if (idx === -1 && typeof updater === 'object') {
        // New assignment — append
        return [...prev, updater];
      }
      if (idx === -1) return prev;
      if (updater === null) {
        // Remove
        return prev.filter((_, i) => i !== idx);
      }
      // Update
      return prev.map((ta, i) =>
        i === idx ? (typeof updater === 'function' ? updater(ta) : { ...ta, ...updater }) : ta
      );
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <DataContext.Provider value={{
      students, tests, results, testAssignments,
      loading, error, lastRefresh,
      refresh, updateTest, updateAssignment
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
