'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '@/hooks/useData';
import { parseClassCode, getStudentSubjects, formatDate } from '@/lib/helpers';
import { getAssignmentsForTest } from '@/lib/assignments';
import { assignStudent, removeClassAssignment } from '@/lib/mutations';

export default function StudentSearchWidget({ test, onMutate }) {
  const { students, testAssignments } = useData();
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Classes already assigned to this test
  const existingAssignments = getAssignmentsForTest(test.id, testAssignments);
  const assignedClassCodes = new Set(existingAssignments.map(ta => ta.class_code));

  // Check if a student's class is already assigned
  function isStudentClassAssigned(student) {
    const classCodes = (student.class_codes || []).filter(c => parseClassCode(c).subject === test.subject);
    return classCodes.some(c => assignedClassCodes.has(c));
  }

  const matchingStudents = useCallback(() => {
    if (!search || search.length < 1) return [];
    const term = search.toLowerCase();
    return students.filter(s => {
      const subjects = getStudentSubjects(s);
      return subjects.includes(test.subject) && s.name.toLowerCase().includes(term);
    }).slice(0, 8);
  }, [search, students, test.subject]);

  async function handleAssign(studentId) {
    const result = await assignStudent(test, studentId, students, dueDate || null);
    if (result) {
      setSearch('');
      setShowDropdown(false);
      onMutate?.();
    }
  }

  async function handleRemoveClass(classCode) {
    const ok = await removeClassAssignment(test.id, classCode);
    if (ok) onMutate?.();
  }

  const matches = matchingStudents();

  return (
    <div className="relative mt-1.5" onClick={e => e.stopPropagation()}>
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type student name to assign their class..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => search.length >= 1 && setShowDropdown(true)}
            className="w-full text-xs"
            style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', outline: 'none' }}
          />
          {showDropdown && search.length >= 1 && (
            <div
              ref={dropdownRef}
              className="absolute bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto"
              style={{ top: 34, left: 0, right: 0 }}
            >
              {matches.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-400">No matching students</div>
              ) : matches.map(s => {
                const isAssigned = isStudentClassAssigned(s);
                const classCodes = (s.class_codes || []).filter(c => parseClassCode(c).subject === test.subject);
                return (
                  <button
                    key={s.id}
                    onClick={() => !isAssigned && handleAssign(s.id)}
                    disabled={isAssigned}
                    className="flex items-center justify-between w-full text-left border-none bg-transparent px-3 py-2 text-xs text-slate-700 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition"
                    style={{ fontFamily: 'inherit', opacity: isAssigned ? 0.4 : 1 }}
                  >
                    <div>
                      <span className="font-medium">{s.name}</span>
                      {isAssigned && <span className="text-green-600 ml-1 text-[10px]">✓ class assigned</span>}
                    </div>
                    <div className="flex gap-1">
                      {classCodes.map(c => (
                        <span key={c} className="mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400">Due:</span>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="text-[11px]"
            style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Assigned classes */}
      {existingAssignments.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Assigned Classes ({existingAssignments.length})
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {existingAssignments.map(ta => {
              const classStudentCount = students.filter(s => (s.class_codes || []).includes(ta.class_code)).length;
              return (
                <span key={ta.class_code} className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px]" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span className="mono text-green-800 font-medium">{ta.class_code}</span>
                  <span className="text-green-500 text-[9px]">{classStudentCount} students</span>
                  {ta.due_date && <span className="text-green-400 text-[9px]">due {formatDate(ta.due_date + 'T00:00:00')}</span>}
                  <button
                    onClick={() => handleRemoveClass(ta.class_code)}
                    className="border-none bg-transparent cursor-pointer text-green-300 text-[10px] p-0 hover:text-red-400"
                    title={`Remove ${ta.class_code}`}
                  >✕</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
