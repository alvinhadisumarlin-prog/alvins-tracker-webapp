'use client';
import { useState, useEffect, useMemo } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import Spinner from '@/components/ui/Spinner';
import ResultCard from '@/components/student/ResultCard';

const TRACKER_API = 'https://ipjolefhnzwthmalripz.supabase.co/functions/v1';

export default function ResultsPage() {
  const { token } = useStudentAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    if (!token) return;
    
    fetch(`${TRACKER_API}/get-my-results`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load results');
        return res.json();
      })
      .then(data => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  // Compute filter options from data
  const subjects = useMemo(() => {
    return [...new Set(results.map(r => r.active_tests?.subject).filter(Boolean))];
  }, [results]);

  const months = useMemo(() => {
    return [...new Set(results.map(r => {
      const d = new Date(r.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();
  }, [results]);

  // Apply filters
  const filteredResults = useMemo(() => {
    let filtered = results;
    
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(r => r.active_tests?.subject === subjectFilter);
    }
    
    if (monthFilter !== 'all') {
      filtered = filtered.filter(r => {
        const d = new Date(r.created_at);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === monthFilter;
      });
    }
    
    return filtered;
  }, [results, subjectFilter, monthFilter]);

  // Summary stats
  const summary = useMemo(() => {
    const count = filteredResults.length;
    const avg = count > 0 
      ? Math.round(filteredResults.reduce((s, r) => s + r.percentage, 0) / count) 
      : 0;
    return { count, avg };
  }, [filteredResults]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-4">📚</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome to your Score Tracker!</h2>
        <p className="text-slate-600">
          Once you complete your first test, your results and progress will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-slate-800">{summary.count}</div>
          <div className="text-sm text-slate-500 mt-1">Tests Taken</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {summary.count > 0 ? `${summary.avg}%` : '-'}
          </div>
          <div className="text-sm text-slate-500 mt-1">Average Score</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 uppercase">Subject</span>
          <button
            onClick={() => setSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              subjectFilter === 'all' 
                ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
            }`}
          >
            All
          </button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                subjectFilter === s 
                  ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {months.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-400 uppercase">Time</span>
            <button
              onClick={() => setMonthFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                monthFilter === 'all' 
                  ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
              }`}
            >
              All Time
            </button>
            {months.slice(0, 3).map(m => {
              const [y, mo] = m.split('-');
              const label = new Date(y, mo - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
              return (
                <button
                  key={m}
                  onClick={() => setMonthFilter(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    monthFilter === m 
                      ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Results</h2>
          <span className="text-sm text-slate-400">
            {filteredResults.length} test{filteredResults.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No results match your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((result, idx) => (
              <ResultCard key={result.id || idx} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
