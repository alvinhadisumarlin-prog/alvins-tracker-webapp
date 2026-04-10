'use client';
import { useState, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import SubjectPill from '@/components/ui/SubjectPill';
import StudentView from './StudentView';
import TeacherView from './TeacherView';
import { pct, pctColor, testRef, studentAvg } from '@/lib/helpers';
import { getStudentResults, getStudentById, getTestById } from '@/lib/queries';
import { generateStudentPDF } from '@/lib/pdf';

export default function StudentPanel({ studentId, initialResultId, onClose }) {
  const { students, tests, results } = useData();
  const [selectedResultId, setSelectedResultId] = useState(initialResultId);
  const [detailView, setDetailView] = useState('student');

  const student = getStudentById(studentId, students);
  const studentResults = student ? getStudentResults(student.id, results) : [];
  const avg = student ? studentAvg(student.id, results, tests) : null;

  // Default to first result if none selected
  const selectedResult = selectedResultId
    ? results.find(r => r.id === selectedResultId)
    : (studentResults[0] || null);
  const selectedTest = selectedResult ? getTestById(selectedResult.test_id, tests) : null;

  // Update selection when initialResultId changes
  useEffect(() => {
    setSelectedResultId(initialResultId);
    setDetailView('student');
  }, [initialResultId, studentId]);

  if (!student) return null;

  const p = selectedResult && selectedTest ? pct(selectedResult.total_marks, selectedTest.max_marks) : null;

  function handleExportPDF() {
    generateStudentPDF(student, results, tests);
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="panel" onClick={e => e.stopPropagation()}>
        {/* Panel Header */}
        <div className="sticky top-0 bg-white border-b z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{student.name}</h2>
              <p className="text-sm text-slate-500">
                {student.school || ''} • {(student.class_codes || []).join(', ') || 'No classes'} • {student.telegram_id ? '🔗 Linked' : '⬜ Not linked'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-700 transition border-none cursor-pointer"
                style={{ fontFamily: 'inherit' }}
              >
                📄 Export PDF
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl px-2 border-none bg-transparent cursor-pointer">✕</button>
            </div>
          </div>
          {avg !== null && (
            <div className="mt-2 text-sm">
              Overall avg: <span className={`font-semibold ${pctColor(avg)}`}>{avg}%</span> across {studentResults.length} test{studentResults.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Test Selector */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Select Test</h3>
            <div className="flex flex-wrap gap-2">
              {studentResults.map(r => {
                const test = getTestById(r.test_id, tests);
                if (!test) return null;
                const rp = pct(r.total_marks, test.max_marks);
                const isSelected = selectedResult && r.id === selectedResult.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedResultId(r.id); setDetailView('student'); }}
                    className={`px-3 py-2 rounded-lg text-sm border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                    style={{ fontFamily: 'inherit' }}
                  >
                    <span className="mono text-xs">{testRef(test)}</span>
                    <span className={`ml-1 font-medium ${isSelected ? '' : pctColor(rp)}`}>
                      {r.total_marks}/{test.max_marks}
                    </span>
                  </button>
                );
              })}
            </div>
            {studentResults.length === 0 && <p className="text-sm text-slate-400">No results yet.</p>}
          </div>

          {/* Result Detail */}
          {selectedResult && selectedTest && (
            <>
              {/* Result Header */}
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-sm text-slate-500">{testRef(selectedTest)}</span>
                      <SubjectPill subject={selectedTest.subject} />
                    </div>
                    <h3 className="font-semibold text-slate-800 mt-1">{selectedTest.display_name}</h3>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${pctColor(p)}`}>
                      {selectedResult.total_marks}/{selectedTest.max_marks}
                    </div>
                    <div className="text-sm text-slate-400">{p}%</div>
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="view-toggle flex bg-slate-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setDetailView('student')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border-none cursor-pointer ${
                    detailView === 'student' ? 'active' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ fontFamily: 'inherit', background: detailView === 'student' ? undefined : 'transparent' }}
                >
                  👤 Student View
                </button>
                <button
                  onClick={() => setDetailView('teacher')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border-none cursor-pointer ${
                    detailView === 'teacher' ? 'active' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ fontFamily: 'inherit', background: detailView === 'teacher' ? undefined : 'transparent' }}
                >
                  🔬 Teacher View
                </button>
              </div>

              {detailView === 'student'
                ? <StudentView questions={selectedResult.questions || []} />
                : <TeacherView tracker={selectedResult.tracker_data || {}} />
              }
            </>
          )}
        </div>
      </div>
    </>
  );
}
