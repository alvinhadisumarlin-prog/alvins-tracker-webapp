'use client';
import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/hooks/useData';
import StatCard from '@/components/ui/StatCard';
import SubjectFilter from '@/components/ui/SubjectFilter';
import DashboardTestRow from '@/components/dashboard/DashboardTestRow';
import { pct, pctColor, pctIcon, overallAvg, aggregateConceptsWrong } from '@/lib/helpers';
import { getStudentById, getTestById } from '@/lib/queries';
import { sylName } from '@/lib/syllabus';
import StudentPanel from '@/components/students/StudentPanel';

export default function DashboardPage() {
  const { students, tests, results, refresh } = useData();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const [panelStudent, setPanelStudent] = useState(null);

  // Available subjects from tests
  const availSubjects = useMemo(() =>
    [...new Set(tests.map(t => t.subject))].sort(),
    [tests]
  );

  // Auto-select first subject if current isn't valid
  const activeSubject = useMemo(() => {
    if (selectedSubject && availSubjects.includes(selectedSubject)) return selectedSubject;
    return availSubjects[0] || 'BIO';
  }, [selectedSubject, availSubjects]);

  // Stats
  const avg = useMemo(() => overallAvg(results, tests), [results, tests]);
  const activeTests = useMemo(() => tests.filter(t => t.is_current), [tests]);

  // Filtered tests by subject
  const filteredTests = useMemo(() => tests.filter(t => t.subject === activeSubject), [tests, activeSubject]);
  const activeFiltered = useMemo(() => filteredTests.filter(t => t.is_current), [filteredTests]);
  const archivedFiltered = useMemo(() => filteredTests.filter(t => !t.is_current), [filteredTests]);

  // Recent results (last 8)
  const recentResults = useMemo(() => results.slice(0, 8), [results]);

  // Weak concepts (top 6)
  const weakConcepts = useMemo(() => aggregateConceptsWrong(results).slice(0, 6), [results]);

  function handleSubjectChange(subj) {
    setSelectedSubject(subj);
    setOpenTestId(null);
  }

  function handleTestToggle(testId) {
    setOpenTestId(prev => prev === testId ? null : testId);
  }

  const handleMutate = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Students" value={students.length} icon="👥" />
        <StatCard label="Tests" value={tests.length} icon="📝" />
        <StatCard label="Active" value={activeTests.length} icon="📌" />
        <StatCard label="Results" value={results.length} icon="📊" />
        <StatCard
          label="Average"
          value={avg !== null ? avg + '%' : '-'}
          icon="🎯"
          colorClass={avg !== null ? pctColor(avg) : ''}
        />
      </div>

      {/* Tests with assignment — filtered by subject */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            📝 Tests — Assign Students
          </h3>
          <SubjectFilter
            subjects={availSubjects}
            selected={activeSubject}
            onChange={handleSubjectChange}
          />
        </div>

        {filteredTests.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-sm">No tests for this subject yet.</div>
        ) : (
          <>
            {activeFiltered.length > 0 ? (
              <div className="space-y-3">
                {activeFiltered.map(t => (
                  <DashboardTestRow
                    key={t.id}
                    test={t}
                    isOpen={openTestId === t.id}
                    onToggle={() => handleTestToggle(t.id)}
                    onMutate={handleMutate}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-4 text-center text-slate-400 text-sm">No active tests.</div>
            )}

            {archivedFiltered.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 font-medium uppercase tracking-wide">
                  📁 Archived ({archivedFiltered.length})
                </summary>
                <div className="space-y-3 mt-3">
                  {archivedFiltered.map(t => (
                    <DashboardTestRow
                      key={t.id}
                      test={t}
                      isOpen={openTestId === t.id}
                      onToggle={() => handleTestToggle(t.id)}
                      onMutate={handleMutate}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {/* Bottom panels: Recent Results + Weak Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Recent Results</h3>
          {recentResults.length > 0 ? (
            <div className="space-y-2">
              {recentResults.map(r => {
                const student = getStudentById(r.student_id, students);
                const test = getTestById(r.test_id, tests);
                if (!student || !test) return null;
                const p = pct(r.total_marks, test.max_marks);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2 transition"
                    onClick={() => setPanelStudent({ studentId: student.id, resultId: r.id })}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs">{pctIcon(p)}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{student.name}</div>
                        <div className="text-xs text-slate-400">{test.display_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold mono ${pctColor(p)}`}>
                        {r.total_marks}/{test.max_marks}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{p}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No results yet.</p>
          )}
        </div>

        {/* Weak Concepts */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">⚠ Common Weak Concepts</h3>
          {weakConcepts.length > 0 ? (
            <div className="space-y-2">
              {weakConcepts.map(([code, count]) => (
                <div key={code} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2.5">
                  <div>
                    <span className="mono text-amber-700 font-medium text-sm">{code}</span>
                    <span className="text-slate-600 text-sm ml-2">{sylName(code)}</span>
                  </div>
                  <span className="text-amber-600 font-semibold text-sm">{count}×</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No error data yet.</p>
          )}
        </div>
      </div>

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
