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
  const [showArchived, setShowArchived] = useState(false);

  const availSubjects = useMemo(() =>
    [...new Set(tests.map(t => t.subject))].sort(),
    [tests]
  );

  const activeSubject = useMemo(() => {
    if (selectedSubject && availSubjects.includes(selectedSubject)) return selectedSubject;
    return availSubjects[0] || 'BIO';
  }, [selectedSubject, availSubjects]);

  // Filter by subject
  const subjectTests = useMemo(() =>
    tests.filter(t => t.subject === activeSubject),
    [tests, activeSubject]
  );

  // Split into active and archived, both sorted by test_number desc
  const activeTests = useMemo(() =>
    subjectTests
      .filter(t => t.is_current)
      .sort((a, b) => b.test_number - a.test_number),
    [subjectTests]
  );

  const archivedTests = useMemo(() =>
    subjectTests
      .filter(t => !t.is_current)
      .sort((a, b) => b.test_number - a.test_number),
    [subjectTests]
  );

  // Stats for lifecycle stat cards (active tests only)
  const { totalAssigned, totalMarked } = useMemo(() => {
    let assigned = 0, marked = 0;
    activeTests.forEach(t => {
      const eff = getEffectiveAssignments(t, students, results, testAssignments);
      Object.values(eff).forEach(a => {
        assigned++;
        if (a.marked) marked++;
      });
    });
    return { totalAssigned: assigned, totalMarked: marked };
  }, [activeTests, students, results, testAssignments]);

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
            <StatCard label="Active Tests" value={activeTests.length} icon="📝" />
            <StatCard label="Archived" value={archivedTests.length} icon="📁" />
            <StatCard label="Assigned" value={totalAssigned} icon="👤" />
            <StatCard label="Marked" value={totalMarked} icon="✅" colorClass={totalMarked > 0 ? 'stat-green' : ''} />
          </div>

          {/* Active Tests Table */}
          {activeTests.length === 0 && archivedTests.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              No {subjectLabel(activeSubject)} tests yet.
            </div>
          ) : (
            <>
              {activeTests.length > 0 && (
                <div className="card overflow-hidden">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="w-full" style={{ minWidth: 600 }}>
                      <thead>
                        <tr className="text-xs text-slate-400 uppercase" style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '6px 12px', textAlign: 'left', width: 100 }}>Test</th>
                          <th style={{ padding: '6px 12px', textAlign: 'left' }}>Name</th>
                          <th style={{ padding: '6px 12px', textAlign: 'center', width: 110 }}>PDF</th>
                          <th style={{ padding: '6px 12px', textAlign: 'center', width: 80 }}>Assigned</th>
                          <th style={{ padding: '6px 12px', textAlign: 'center', width: 80 }}>Marked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTests.map(t => (
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

              {/* Archived Tests Collapsible */}
              {archivedTests.length > 0 && (
                <div className="card overflow-hidden">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition"
                    style={{ background: '#fafbfc', borderBottom: showArchived ? '1px solid #e2e8f0' : 'none' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{showArchived ? '▼' : '▶'}</span>
                      <span className="text-sm font-medium text-slate-600">📁 Archived Tests</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        {archivedTests.length}
                      </span>
                    </div>
                  </button>
                  
                  {showArchived && (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="w-full" style={{ minWidth: 600 }}>
                        <thead>
                          <tr className="text-xs text-slate-400 uppercase" style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '6px 12px', textAlign: 'left', width: 100 }}>Test</th>
                            <th style={{ padding: '6px 12px', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '6px 12px', textAlign: 'center', width: 110 }}>PDF</th>
                            <th style={{ padding: '6px 12px', textAlign: 'center', width: 80 }}>Assigned</th>
                            <th style={{ padding: '6px 12px', textAlign: 'center', width: 80 }}>Marked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archivedTests.map(t => (
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
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Cards view */
        <>
          {activeTests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">📌 Active Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTests.map(t => <TestCard key={t.id} test={t} onOpenPanel={handleOpenPanel} />)}
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
          {subjectTests.length === 0 && (
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
