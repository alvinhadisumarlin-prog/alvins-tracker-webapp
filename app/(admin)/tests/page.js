'use client';
import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/hooks/useData';
import StatCard from '@/components/ui/StatCard';
import SubjectFilter from '@/components/ui/SubjectFilter';
import TestLifecycleRow from '@/components/tests/TestLifecycleRow';
import TestCard from '@/components/tests/TestCard';
import { subjectLabel } from '@/lib/helpers';
import { getEffectiveAssignments } from '@/lib/assignments';
import StudentPanel from '@/components/students/StudentPanel';

export default function TestsPage() {
  const { students, tests, results, testAssignments, refresh } = useData();
  const [view, setView] = useState('lifecycle');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);
  const [panelStudent, setPanelStudent] = useState(null);

  const availSubjects = useMemo(() =>
    [...new Set(tests.map(t => t.subject))].sort(),
    [tests]
  );

  const activeSubject = useMemo(() => {
    if (selectedSubject && availSubjects.includes(selectedSubject)) return selectedSubject;
    return availSubjects[0] || 'BIO';
  }, [selectedSubject, availSubjects]);

  // Sorted tests for lifecycle view: active first, then by test_number desc
  const sorted = useMemo(() =>
    [...tests]
      .filter(t => t.subject === activeSubject)
      .sort((a, b) => {
        if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
        return b.test_number - a.test_number;
      }),
    [tests, activeSubject]
  );

  // Stats for lifecycle stat cards
  const { totalAssigned, totalMarked } = useMemo(() => {
    let assigned = 0, marked = 0;
    sorted.forEach(t => {
      const eff = getEffectiveAssignments(t, students, results, testAssignments);
      Object.values(eff).forEach(a => {
        assigned++;
        if (a.marked) marked++;
      });
    });
    return { totalAssigned: assigned, totalMarked: marked };
  }, [sorted, students, results, testAssignments]);

  // Cards view: split active/archived
  const currentTests = useMemo(() => sorted.filter(t => t.is_current), [sorted]);
  const archivedTests = useMemo(() => sorted.filter(t => !t.is_current), [sorted]);

  function handleSubjectChange(subj) {
    setSelectedSubject(subj);
    setExpandedTest(null);
  }

  const handleMutate = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleOpenPanel = useCallback((studentId, resultId) => {
    setPanelStudent({ studentId, resultId });
  }, []);

  return (
    <div className="space-y-4">
      {/* View toggle + Subject filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: '#f1f5f9' }}>
          <button
            onClick={() => setView('lifecycle')}
            className="px-3.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer border-none transition"
            style={{
              fontFamily: 'inherit',
              ...(view === 'lifecycle'
                ? { background: '#1e293b', color: 'white' }
                : { background: 'transparent', color: '#64748b' })
            }}
          >📋 Lifecycle</button>
          <button
            onClick={() => setView('cards')}
            className="px-3.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer border-none transition"
            style={{
              fontFamily: 'inherit',
              ...(view === 'cards'
                ? { background: '#1e293b', color: 'white' }
                : { background: 'transparent', color: '#64748b' })
            }}
          >🃏 Cards</button>
        </div>
        <SubjectFilter
          subjects={availSubjects}
          selected={activeSubject}
          onChange={handleSubjectChange}
        />
      </div>

      {/* Content */}
      {view === 'lifecycle' ? (
        <>
          {/* Lifecycle stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tests" value={sorted.length} icon="📝" />
            <StatCard label="Active" value={currentTests.length} icon="📌" />
            <StatCard label="Assigned" value={totalAssigned} icon="👤" />
            <StatCard label="Marked" value={totalMarked} icon="✅" colorClass={totalMarked > 0 ? 'stat-green' : ''} />
          </div>

          {sorted.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              No {subjectLabel(activeSubject)} tests yet.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full" style={{ minWidth: 500 }}>
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase" style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left', width: 130 }}>Test</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '6px 12px', textAlign: 'center', width: 90 }}>Assigned</th>
                      <th style={{ padding: '6px 12px', textAlign: 'center', width: 90 }}>Marked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(t => (
                      <TestLifecycleRow
                        key={t.id}
                        test={t}
                        isExpanded={expandedTest === t.id}
                        onToggle={() => setExpandedTest(prev => prev === t.id ? null : t.id)}
                        onMutate={handleMutate}
                        onOpenPanel={handleOpenPanel}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Cards view */
        <>
          {currentTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">📌 Active Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTests.map(t => <TestCard key={t.id} test={t} onOpenPanel={handleOpenPanel} />)}
              </div>
            </div>
          )}
          {archivedTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">📁 Archived Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedTests.map(t => <TestCard key={t.id} test={t} onOpenPanel={handleOpenPanel} />)}
              </div>
            </div>
          )}
          {tests.filter(t => t.subject === activeSubject).length === 0 && (
            <div className="card p-8 text-center text-slate-400">No tests created yet.</div>
          )}
        </>
      )}

      {/* Student detail panel */}
      {panelStudent && (
        <StudentPanel
          studentId={panelStudent.studentId}
          initialResultId={panelStudent.resultId}
          onClose={() => setPanelStudent(null)}
        />
      )}
    </div>
  );
}
