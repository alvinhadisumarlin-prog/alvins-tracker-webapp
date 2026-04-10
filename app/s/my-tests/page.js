'use client';
import { useState, useEffect, useMemo } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import Spinner from '@/components/ui/Spinner';
import TestCard from '@/components/student/TestCard';

const TRACKER_API = 'https://ipjolefhnzwthmalripz.supabase.co/functions/v1';

export default function MyTestsPage() {
  const { token } = useStudentAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    
    fetch(`${TRACKER_API}/get-my-tests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tests');
        return res.json();
      })
      .then(data => {
        setAssignments(data.assignments || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  // Split into pending and submitted
  const { pending, submitted } = useMemo(() => {
    const pending = assignments.filter(a => !a.submitted);
    const submitted = assignments.filter(a => a.submitted);
    
    // Sort pending by due date (earliest first), submitted by submission date (newest first)
    pending.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    
    submitted.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    
    return { pending, submitted };
  }, [assignments]);

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

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-4">📝</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Tests Assigned</h2>
        <p className="text-slate-600">
          When your tutor assigns you tests, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⏳</span>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Pending
          </h2>
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {pending.length}
          </span>
        </div>
        
        {pending.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-green-700 font-medium">All caught up!</p>
            <p className="text-green-600 text-sm">No pending tests right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(assignment => (
              <TestCard 
                key={assignment.id} 
                assignment={assignment} 
                status="pending"
              />
            ))}
          </div>
        )}
      </section>

      {/* Submitted Section */}
      {submitted.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✓</span>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Submitted
            </h2>
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {submitted.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {submitted.map(assignment => (
              <TestCard 
                key={assignment.id} 
                assignment={assignment} 
                status="submitted"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
