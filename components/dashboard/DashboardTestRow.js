'use client';
import { useState } from 'react';
import { useData } from '@/hooks/useData';
import SubjectPill from '@/components/ui/SubjectPill';
import MarkCircle from '@/components/ui/MarkCircle';
import StudentSearchWidget from '@/components/assign/StudentSearchWidget';
import NotifyModal from '@/components/notify/NotifyModal';
import { testRef, formatDate } from '@/lib/helpers';
import { getEffectiveAssignments } from '@/lib/assignments';
import { getTestResults, getStudentById } from '@/lib/queries';

export default function DashboardTestRow({ test, isOpen, onToggle, onMutate }) {
  const { students, results, testAssignments } = useData();
  const [notifyModal, setNotifyModal] = useState(null);

  const assignments = getEffectiveAssignments(test, students, results, testAssignments);
  const assignedEntries = Object.entries(assignments);
  const assignedCount = assignedEntries.length;
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
      <div className="card transition" style={{ overflow: 'visible' }}>
        {/* Header — clickable toggle */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">{isOpen ? '▼' : '▶'}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="mono text-xs text-slate-400">{testRef(test)}</span>
                <SubjectPill subject={test.subject} />
                <span className="text-sm font-medium text-slate-800">{test.display_name}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-400">{test.max_marks}m</span>
                {assignedCount > 0 && <span className="text-xs text-green-600">✓ {assignedCount} assigned</span>}
                {markedCount > 0 && <span className="text-xs" style={{ color: '#16a34a' }}>{markedCount}/{assignedCount} marked</span>}
                {testResults.length > 0 && <span className="text-xs text-blue-600">{testResults.length} results</span>}
                {test.is_current ? (
                  <span className="text-[9px] font-semibold px-1.5 py-px rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>ACTIVE</span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-px rounded-full" style={{ background: '#f1f5f9', color: '#94a3b8' }}>ARCHIVED</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded panel */}
        {isOpen && (
          <div
            className="px-4 pb-3"
            style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}
            onClick={e => e.stopPropagation()}
          >
            {classGroups.length > 0 && classGroups.map(([cls, classStudents]) => {
              const clsMarked = classStudents.filter(s => s.marked).length;
              return (
                <div key={cls} className="mb-2.5">
                  {/* Class group header */}
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

                  {/* Student rows */}
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
            })}

            {/* Add student widget */}
            <div style={classGroups.length > 0 ? { borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 6 } : {}}>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">+ Add Student</span>
              <StudentSearchWidget test={test} onMutate={onMutate} />
            </div>
          </div>
        )}
      </div>

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
