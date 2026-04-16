'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import StudentPanel from '@/components/students/StudentPanel';
import EditStudentModal from '@/components/students/EditStudentModal';
import { pct, pctColor, testRef, formatDate, parseClassCode, getStudentIBYear, getStudentSubjects, studentAvg, aggregateConceptsWrong, aggregateAO } from '@/lib/helpers';
import { getStudentResults, getTestById, getAllClassCodes } from '@/lib/queries';
import { fetchExcludedStudents, restoreStudent, bulkExcludeStudents, bulkAddClassCode } from '@/lib/mutations';
import { sylName } from '@/lib/syllabus';

export default function StudentsPage() {
  const { students, tests, results, refresh } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterLinked, setFilterLinked] = useState('all');
  const [filterClassCodes, setFilterClassCodes] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [panelStudent, setPanelStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Excluded students view
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'excluded'
  const [excludedStudents, setExcludedStudents] = useState([]);
  const [loadingExcluded, setLoadingExcluded] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // 'exclude' | 'addCode' | null
  const [bulkClassCode, setBulkClassCode] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const subjects = useMemo(() => {
    const allSubjects = students.flatMap(s => 
      (s.class_codes || []).map(c => parseClassCode(c).subject)
    );
    return [...new Set(allSubjects)].filter(Boolean).sort();
  }, [students]);
  const classCodes = useMemo(() => getAllClassCodes(students), [students]);
  const ibYears = useMemo(() =>
    [...new Set(students.map(s => getStudentIBYear(s)).filter(Boolean))].sort(),
    [students]
  );

  // Count students missing class codes
  const missingClassCodesCount = useMemo(() =>
    students.filter(s => !s.class_codes || s.class_codes.length === 0).length,
    [students]
  );

  // Load excluded students when switching to that view
  useEffect(() => {
    if (viewMode === 'excluded' && excludedStudents.length === 0) {
      loadExcludedStudents();
    }
  }, [viewMode]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, filterSubject, filterYear, filterClass, filterLinked, filterClassCodes, viewMode]);

  async function loadExcludedStudents() {
    setLoadingExcluded(true);
    const data = await fetchExcludedStudents();
    setExcludedStudents(data);
    setLoadingExcluded(false);
  }

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterSubject !== 'all') {
        const codes = s.class_codes || [];
        if (!codes.some(c => c.includes(filterSubject))) return false;
      }
      if (filterClass !== 'all') {
        if (!(s.class_codes || []).includes(filterClass)) return false;
      }
      if (filterYear !== 'all') {
        if (getStudentIBYear(s) !== filterYear) return false;
      }
      if (filterLinked !== 'all') {
        const hasLink = !!s.telegram_id;
        if (filterLinked === 'linked' && !hasLink) return false;
        if (filterLinked === 'unlinked' && hasLink) return false;
      }
      if (filterClassCodes === 'missing') {
        if (s.class_codes && s.class_codes.length > 0) return false;
      } else if (filterClassCodes === 'assigned') {
        if (!s.class_codes || s.class_codes.length === 0) return false;
      }
      return true;
    });
  }, [students, searchTerm, filterSubject, filterYear, filterClass, filterLinked, filterClassCodes]);

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelect(studentId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(s => next.add(s.id));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkClassCode('');
  }

  // Bulk actions
  async function handleBulkExclude() {
    if (!confirm(`Remove ${selectedIds.size} student(s) from roster?\n\nThey will be hidden and blocked from future /seed syncs.`)) {
      return;
    }
    setBulkLoading(true);
    const result = await bulkExcludeStudents([...selectedIds]);
    setBulkLoading(false);
    if (result.success > 0) {
      clearSelection();
      refresh();
      loadExcludedStudents();
    }
    if (result.failed > 0) {
      alert(`${result.success} excluded, ${result.failed} failed`);
    }
  }

  async function handleBulkAddCode() {
    if (!bulkClassCode.trim()) {
      alert('Enter a class code');
      return;
    }
    const code = bulkClassCode.trim().toUpperCase();
    setBulkLoading(true);
    const result = await bulkAddClassCode([...selectedIds], code, students);
    setBulkLoading(false);
    if (result.success > 0) {
      clearSelection();
      refresh();
    }
    if (result.failed > 0) {
      alert(`${result.success} updated, ${result.failed} failed`);
    }
  }

  function openPanel(studentId, resultId) {
    setPanelStudent({ studentId, resultId });
  }

  function handleEditStudent(student) {
    setEditingStudent(student);
  }

  function handleSaveStudent(updatedStudent) {
    setEditingStudent(null);
    refresh();
  }

  function handleExcludeStudent(excludedStudent) {
    setEditingStudent(null);
    refresh();
    loadExcludedStudents();
  }

  async function handleRestoreStudent(student) {
    const result = await restoreStudent(student.id);
    if (result) {
      setExcludedStudents(prev => prev.filter(s => s.id !== student.id));
      refresh();
    }
  }

  // Get selected students info for display
  const selectedStudents = useMemo(() => 
    students.filter(s => selectedIds.has(s.id)),
    [students, selectedIds]
  );

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              viewMode === 'active'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Roster
          </button>
          <button
            onClick={() => setViewMode('excluded')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              viewMode === 'excluded'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Excluded ({excludedStudents.length})
          </button>
        </div>
      </div>

      {viewMode === 'active' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <select
              value={filterSubject}
              onChange={e => { setFilterSubject(e.target.value); setFilterClass('all'); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="all">All Years</option>
              {ibYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="all">All Classes</option>
              {classCodes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterLinked} onChange={e => setFilterLinked(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="all">All (Linked)</option>
              <option value="linked">✅ Linked</option>
              <option value="unlinked">⬜ Not linked</option>
            </select>
            <select
              value={filterClassCodes}
              onChange={e => setFilterClassCodes(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm ${
                filterClassCodes === 'missing' ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            >
              <option value="all">All (Classes)</option>
              <option value="assigned">✅ Has class codes</option>
              <option value="missing">⚠️ No class codes ({missingClassCodesCount})</option>
            </select>
            <span className="text-sm text-slate-400">
              {filtered.length} students · {filtered.filter(s => s.telegram_id).length} linked
            </span>
          </div>

          {/* Alert banner for missing class codes */}
          {missingClassCodesCount > 0 && filterClassCodes !== 'missing' && (
            <div
              onClick={() => setFilterClassCodes('missing')}
              className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition"
            >
              <span className="text-amber-800 text-sm">
                <span className="font-medium">⚠️ {missingClassCodesCount} student{missingClassCodesCount > 1 ? 's' : ''}</span> without class codes — click to filter
              </span>
              <span className="text-amber-600 text-xs">Click to view →</span>
            </div>
          )}

          {/* Bulk action bar */}
          {someSelected && (
            <div className="bg-slate-800 text-white rounded-lg px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="font-medium">{selectedIds.size} selected</span>
                <button
                  onClick={clearSelection}
                  className="text-slate-300 hover:text-white text-sm"
                >
                  Clear
                </button>
              </div>
              <div className="flex items-center gap-2">
                {bulkAction === 'addCode' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bulkClassCode}
                      onChange={e => setBulkClassCode(e.target.value.toUpperCase())}
                      placeholder="Class code..."
                      className="px-2 py-1 rounded text-sm text-slate-800 w-32"
                      list="bulk-class-codes"
                      autoFocus
                    />
                    <datalist id="bulk-class-codes">
                      {classCodes.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <button
                      onClick={handleBulkAddCode}
                      disabled={bulkLoading || !bulkClassCode.trim()}
                      className="px-3 py-1 bg-green-600 rounded text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                    >
                      {bulkLoading ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setBulkAction(null); setBulkClassCode(''); }}
                      className="px-2 py-1 text-slate-300 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setBulkAction('addCode')}
                      className="px-3 py-1.5 bg-slate-700 rounded text-sm font-medium hover:bg-slate-600"
                    >
                      + Add class code
                    </button>
                    <button
                      onClick={handleBulkExclude}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 bg-red-600 rounded text-sm font-medium hover:bg-red-500 disabled:opacity-50"
                    >
                      {bulkLoading ? 'Removing...' : '🗑 Remove from roster'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">Classes</th>
                  <th className="px-4 py-3 font-medium">Linked</th>
                  <th className="px-4 py-3 font-medium">Results</th>
                  <th className="px-4 py-3 font-medium">Avg</th>
                  <th className="px-4 py-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const studentResults = getStudentResults(student.id, results);
                  const avg = studentAvg(student.id, results, tests);
                  const isExpanded = expandedStudent === student.id;
                  const hasClassCodes = student.class_codes && student.class_codes.length > 0;
                  const isSelected = selectedIds.has(student.id);

                  return (
                    <>
                      <tr
                        key={student.id}
                        className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition ${
                          !hasClassCodes ? 'bg-red-50/50' : ''
                        } ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(student.id)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!hasClassCodes && (
                              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="No class codes" />
                            )}
                            <span className="font-medium text-slate-800">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {student.grad_year ? (
                            <span className="mono">{getStudentIBYear(student) || student.grad_year}</span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasClassCodes ? (
                            <div className="flex flex-wrap gap-1">
                              {student.class_codes.slice(0, 3).map(c => {
                                const parsed = parseClassCode(c);
                                const colors = {
                                  BIO: { bg: '#dcfce7', color: '#166534' },
                                  CHM: { bg: '#dbeafe', color: '#1e40af' },
                                  MAA: { bg: '#f3e8ff', color: '#6b21a8' },
                                  MATH: { bg: '#f3e8ff', color: '#6b21a8' },
                                };
                                const style = colors[parsed.subject] || { bg: '#f1f5f9', color: '#64748b' };
                                return (
                                  <span
                                    key={c}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ background: style.bg, color: style.color }}
                                  >
                                    {c}
                                  </span>
                                );
                              })}
                              {student.class_codes.length > 3 && (
                                <span className="text-slate-400 text-xs">+{student.class_codes.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-red-400 text-xs italic">No classes</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {student.telegram_id ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-slate-300">⬜</span>
                          )}
                        </td>
                        <td className="px-4 py-3 mono text-slate-600">{studentResults.length}</td>
                        <td className="px-4 py-3">
                          {avg !== null ? (
                            <span className={`mono font-medium ${pctColor(avg)}`}>{avg}%</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleEditStudent(student);
                            }}
                            className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${student.id}-expanded`}>
                          <td colSpan={8} className="bg-slate-50 px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Recent results */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Recent Results
                                </h4>
                                {studentResults.length > 0 ? (
                                  <div className="space-y-1">
                                    {studentResults.slice(0, 5).map(r => {
                                      const test = getTestById(r.test_id, tests);
                                      if (!test) return null;
                                      const p = pct(r.total_marks, test.max_marks);
                                      return (
                                        <div
                                          key={r.id}
                                          className="flex items-center justify-between bg-white rounded px-3 py-2 cursor-pointer hover:bg-slate-100 transition"
                                          onClick={e => {
                                            e.stopPropagation();
                                            openPanel(student.id, r.id);
                                          }}
                                        >
                                          <span className="text-sm text-slate-700">{test.display_name}</span>
                                          <span className={`mono text-sm font-medium ${pctColor(p)}`}>
                                            {r.total_marks}/{test.max_marks} ({p}%)
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-slate-400 text-sm">No results yet</p>
                                )}
                              </div>

                              {/* Weak concepts */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Weak Concepts
                                </h4>
                                {(() => {
                                  const weak = aggregateConceptsWrong(studentResults).slice(0, 4);
                                  return weak.length > 0 ? (
                                    <div className="space-y-1">
                                      {weak.map(([code, count]) => (
                                        <div key={code} className="flex items-center justify-between bg-amber-50 rounded px-3 py-2">
                                          <div>
                                            <span className="mono text-amber-700 font-medium text-sm">{code}</span>
                                            <span className="text-slate-600 text-sm ml-2">{sylName(code)}</span>
                                          </div>
                                          <span className="text-amber-600 font-semibold text-sm">{count}×</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 text-sm">No error data</p>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-400">
                No students match the current filters
              </div>
            )}
          </div>
        </>
      ) : (
        /* Excluded students view */
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">
              Excluded Students
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These students won't appear in the roster and will be skipped during /seed syncs
            </p>
          </div>

          {loadingExcluded ? (
            <div className="px-4 py-8 text-center text-slate-400">
              Loading...
            </div>
          ) : excludedStudents.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">
              No excluded students
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Classes</th>
                  <th className="px-4 py-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {excludedStudents.map(student => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                    <td className="px-4 py-3 text-slate-500">{student.school || '—'}</td>
                    <td className="px-4 py-3">
                      {(student.class_codes || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.class_codes.map(c => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRestoreStudent(student)}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition"
                      >
                        ↩️ Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Student detail panel */}
      {panelStudent && (
        <StudentPanel
          studentId={panelStudent.studentId}
          initialResultId={panelStudent.resultId}
          onClose={() => setPanelStudent(null)}
        />
      )}

      {/* Edit student modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          allStudents={students}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveStudent}
          onExclude={handleExcludeStudent}
        />
      )}
    </div>
  );
}
