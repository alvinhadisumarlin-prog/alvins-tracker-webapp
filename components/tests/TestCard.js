'use client';
import { useData } from '@/hooks/useData';
import SubjectPill from '@/components/ui/SubjectPill';
import { testRef, pct, pctColor, pctIcon, getStudentIBYear, parseClassCode } from '@/lib/helpers';
import { getTestResults, getStudentById } from '@/lib/queries';

export default function TestCard({ test, onOpenPanel }) {
  const { students, results } = useData();
  const testResults = getTestResults(test.id, results);

  const avgP = testResults.length > 0
    ? Math.round(testResults.reduce((sum, r) => sum + pct(r.total_marks, test.max_marks), 0) / testResults.length)
    : null;

  // Students in this subject
  const subjectStudents = students.filter(s =>
    (s.class_codes || []).some(c => parseClassCode(c).subject === test.subject)
  );
  const submittedIds = new Set(testResults.map(r => r.student_id));
  const missing = subjectStudents.filter(s => !submittedIds.has(s.id));

  // Group missing by IB year
  const missingByYear = {};
  missing.forEach(s => {
    const yr = getStudentIBYear(s) || 'Unknown';
    if (!missingByYear[yr]) missingByYear[yr] = [];
    missingByYear[yr].push(s);
  });
  const yearGroups = Object.entries(missingByYear).sort((a, b) => a[0].localeCompare(b[0]));

  // Ranked results
  const ranked = testResults
    .map(r => ({ ...r, p: pct(r.total_marks, test.max_marks), student: getStudentById(r.student_id, students) }))
    .sort((a, b) => b.p - a.p);

  return (
    <div className="card p-4 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono text-xs text-slate-400">{testRef(test)}</span>
            <SubjectPill subject={test.subject} />
          </div>
          <h3 className="font-semibold text-slate-800 mt-1">{test.display_name}</h3>
        </div>
        <span className="text-sm font-medium text-slate-400">{test.max_marks}m</span>
      </div>

      {/* Syllabus codes */}
      {(test.syllabus_codes || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {test.syllabus_codes.map(c => (
            <span key={c} className="mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}

      {/* Results */}
      {testResults.length > 0 ? (
        <div className="border-t border-slate-100 pt-3 mt-2">
          <details>
            <summary className="flex justify-between items-center cursor-pointer">
              <span className="text-xs text-slate-400">{testResults.length} submitted</span>
              {avgP !== null && <span className={`text-sm font-semibold ${pctColor(avgP)}`}>Avg: {avgP}%</span>}
            </summary>
            <div className="space-y-1 mt-2">
              {ranked.map((r, i) => r.student ? (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm py-1 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition"
                  onClick={() => onOpenPanel?.(r.student_id, r.id)}
                >
                  <span>{i + 1}. {pctIcon(r.p)} {r.student.name}</span>
                  <span className={`mono font-medium ${pctColor(r.p)}`}>{r.total_marks}/{test.max_marks}</span>
                </div>
              ) : null)}
            </div>
          </details>
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-3 mt-2 text-sm text-slate-400">No results yet</div>
      )}

      {/* Missing students */}
      {missing.length > 0 && testResults.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
            {missing.length} not submitted
          </summary>
          <div className="mt-2 space-y-1.5">
            {yearGroups.map(([yr, yStudents]) => (
              <div key={yr}>
                <span className="text-xs font-semibold text-slate-500">{yr}</span>
                <span className="text-xs text-slate-300 ml-1">({yStudents.length})</span>
                <div className="text-xs text-slate-400 leading-relaxed ml-2">
                  {yStudents.map(s => s.name).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
