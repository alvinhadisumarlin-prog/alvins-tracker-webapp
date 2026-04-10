'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import MarkCircle from '@/components/ui/MarkCircle';
import StudentSearchWidget from '@/components/assign/StudentSearchWidget';
import NotifyModal from '@/components/notify/NotifyModal';
import { testRef, formatDate, parseClassCode } from '@/lib/helpers';
import { getEffectiveAssignments } from '@/lib/assignments';
import { getTestResults, getStudentById } from '@/lib/queries';

export default function TestLifecycleRow({ test, isExpanded, onToggle, onMutate }) {
  const { students, results, testAssignments } = useData();
  const [notifyModal, setNotifyModal] = useState(null);

  const assignments = getEffectiveAssignments(test, students, results, testAssignments);
  const assignedEntries = Object.entries(assignments);
  const markedCount = assignedEntries.filter(([, a]) => a.marked).length;
  const testResults = getTestResults(test.id, results);

  // Group by class code
  const byClass = {};
  assignedEntries.forEach(([sid, info]) => {
    const cls = info.class_code || 'Unclassified';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push({ studentId: sid, ...info });
  });
  const classGroups = Object.entries(byClass).sort((a, b) => a[0].localeCompare(b[0]));

  function handleNotifyClass(classCode) {
    const eff = getEffectiveAssignments(test, students, results, testAssignments);
    const recipients = Object.entries(eff)
      .filter(([, info]) => info.class_code === classCode)
      .map(([sid, info]) => {
        const s = getStudentById(sid, students);
        return s ? { name: s.name, telegram_id: s.telegram_id, marked: !!info.marked } : null;
      })
      .filter(Boolean);
    const msg = `📝 Reminder: ${test.display_name} (${testRef(test)}) has been assigned to your class ${classCode}. Please submit your answers.`;
    setNotifyModal({ recipients, message: msg });
  }

  return (
    <>
      {/* Main row */}
      <tr
        className="hover:bg-slate-50 cursor-pointer"
        style={{ borderBottom: '1px solid #f1f5f9' }}
        onClick={onToggle}
      >
        <td style={{ padding: '8px 12px' }}>
          <span className="text-[10px] text-slate-400 mr-1">{isExpanded ? '▼' : '▶'}</span>
          <span className="mono text-xs text-slate-500">{testRef(test)}</span>
        </td>
        <td style={{ padding: '8px 12px' }}>
          <div className="text-[13px] font-medium text-slate-900">{test.display_name}</div>
          <div className="mt-0.5 flex items-center gap-1 flex-wrap">
            {(test.syllabus_codes || []).map(c => (
              <span key={c} className="mono text-[10px] text-slate-400">{c}</span>
            ))}
            {!test.is_current && (
              <span className="text-[9px] font-semibold px-1.5 py-px rounded-full ml-1" style={{ background: '#f1f5f9', color: '#94a3b8' }}>ARCHIVED</span>
            )}
          </div>
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
          <span className="text-[13px] font-semibold" style={{ color: assignedEntries.length > 0 ? '#1e293b' : '#cbd5e1' }}>
            {assignedEntries.length || '—'}
          </span>
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
          {assignedEntries.length > 0 ? (
            <span className={`text-[13px] font-semibold ${markedCount === assignedEntries.length ? 'stat-green' : markedCount > 0 ? 'stat-amber' : ''}`}>
              {markedCount}/{assignedEntries.length}
            </span>
          ) : (
            <span className="text-[13px]" style={{ color: '#cbd5e1' }}>—</span>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr style={{ background: '#fafbfc' }} onClick={e => e.stopPropagation()}>
          <td colSpan={4} style={{ padding: '10px 16px' }}>
            {classGroups.length > 0 ? classGroups.map(([cls, classStudents]) => {
              const clsMarked = classStudents.filter(s => s.marked).length;
              return (
                <div key={cls} className="mb-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-[11px] font-semibold text-slate-600">{cls}</span>
                      <span className="text-[10px] text-slate-400">{clsMarked}/{classStudents.length} marked</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => handleNotifyClass(cls)} className="notify-btn">📩 Notify</button>
                      {clsMarked === classStudents.length && classStudents.length > 0 && (
                        <span className="text-[10px] text-green-600 font-medium">✓ All done</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {classStudents.map(s => {
                      const student = getStudentById(s.studentId, students);
                      if (!student) return null;
                      const result = testResults.find(r => r.student_id === s.studentId);

                      const scoreBadge = result ? (
                        <span className="text-[9px] font-semibold px-1.5 py-px rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>
                          {result.total_marks}/{test.max_marks}
                        </span>
                      ) : null;

                      const timeInfo = s.marked_at
                        ? formatDate(s.marked_at)
                        : s.assigned_date
                        ? formatDate(s.assigned_date + 'T00:00:00')
                        : '';

                      return (
                        <div
                          key={s.studentId}
                          className="flex items-center justify-between rounded-md"
                          style={{
                            padding: '5px 10px',
                            background: s.marked ? '#f0fdf4' : 'white',
                            border: `1px solid ${s.marked ? '#bbf7d0' : '#f1f5f9'}`
                          }}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-slate-900">{student.name}</span>
                            {scoreBadge}
                          </div>
                          <div className="flex items-center gap-2">
                            {timeInfo && <span className="text-[10px] text-slate-500 font-medium">{timeInfo}</span>}
                            <MarkCircle marked={s.marked} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-3 text-slate-400 text-xs">
                No students assigned or results recorded. Assign students on the Dashboard or mark papers to auto-populate.
              </div>
            )}

            {/* Add student */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 6 }}>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">+ Add Student</span>
              <StudentSearchWidget test={test} onMutate={onMutate} />
            </div>
          </td>
        </tr>
      )}

      {/* Notify modal */}
      {notifyModal && (
        <NotifyModal
          recipients={notifyModal.recipients}
          defaultMessage={notifyModal.message}
          onClose={() => setNotifyModal(null)}
        />
      )}
    </>
  );
}
