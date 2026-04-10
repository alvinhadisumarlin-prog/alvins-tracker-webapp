'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTrainingData, saveCorrections, approveAsIs, getStorageUrl } from '@/lib/training';

// ============ MAIN PAGE COMPONENT ============
export default function ReviewPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editedQuestions, setEditedQuestions] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await fetchTrainingData();
    setRecords(data);
    setLoading(false);
  }

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterStatus === 'pending' && r.was_corrected) return false;
      if (filterStatus === 'corrected' && !r.was_corrected) return false;
      if (filterSubject !== 'all' && r.subject !== filterSubject) return false;
      if (filterSearch) {
        const ctx = (r.test_context || '').toLowerCase();
        const sch = (r.school || '').toLowerCase();
        const q = filterSearch.toLowerCase();
        if (!ctx.includes(q) && !sch.includes(q)) return false;
      }
      return true;
    });
  }, [records, filterStatus, filterSubject, filterSearch]);

  // Stats
  const stats = useMemo(() => ({
    total: records.length,
    corrected: records.filter(r => r.was_corrected).length,
    pending: records.filter(r => !r.was_corrected).length,
  }), [records]);

  // Selected record
  const selected = useMemo(() => {
    return records.find(r => r.id === selectedId) || null;
  }, [records, selectedId]);

  // Handle selection
  function handleSelect(id) {
    setSelectedId(id);
    setEditedQuestions({});
  }

  // Edit a question field
  function handleEditQuestion(idx, field, value) {
    setEditedQuestions(prev => {
      const existing = prev[idx] || {};
      const original = selected?.questions?.[idx] || {};
      return {
        ...prev,
        [idx]: {
          marks: existing.marks ?? original.marks ?? original.marks_awarded ?? 0,
          feedback: existing.feedback ?? original.feedback ?? original.error_notes ?? '',
          misconception: existing.misconception ?? original.misconception ?? original.misconception_freetext ?? '',
          [field]: field === 'marks' ? parseInt(value) || 0 : value,
        },
      };
    });
  }

  // Reset edits
  function handleReset() {
    setEditedQuestions({});
  }

  // Show toast
  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Save corrections
  async function handleSave() {
    if (!selected || Object.keys(editedQuestions).length === 0) {
      showToast('No changes to save', 'error');
      return;
    }

    setSaving(true);
    try {
      const corrections = Object.entries(editedQuestions).map(([idx, edits]) => ({
        question_index: parseInt(idx),
        original: selected.questions[idx],
        corrected: edits,
        corrected_at: new Date().toISOString(),
      }));

      const updatedQuestions = selected.questions.map((q, idx) => {
        if (editedQuestions[idx]) {
          return {
            ...q,
            marks: editedQuestions[idx].marks,
            marks_awarded: editedQuestions[idx].marks,
            feedback: editedQuestions[idx].feedback,
            error_notes: editedQuestions[idx].feedback,
            misconception: editedQuestions[idx].misconception,
            misconception_freetext: editedQuestions[idx].misconception,
          };
        }
        return q;
      });

      const newTotalMarks = updatedQuestions.reduce(
        (sum, q) => sum + (q.marks ?? q.marks_awarded ?? 0),
        0
      );
      const newPercentage = selected.max_marks > 0
        ? (newTotalMarks / selected.max_marks) * 100
        : 0;

      await saveCorrections(selected.id, {
        updatedQuestions,
        newCorrections: corrections,
        newTotalMarks,
        newPercentage,
      });

      // Update local state
      setRecords(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
                ...r,
                questions: updatedQuestions,
                was_corrected: true,
                total_marks: newTotalMarks,
                percentage: newPercentage,
              }
            : r
        )
      );
      setEditedQuestions({});
      showToast('Corrections saved!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Approve as-is (no changes needed)
  async function handleApprove() {
    if (!selected) return;
    setSaving(true);
    try {
      await approveAsIs(selected.id);
      setRecords(prev =>
        prev.map(r =>
          r.id === selected.id ? { ...r, was_corrected: true } : r
        )
      );
      showToast('Approved as-is!', 'success');
    } catch (err) {
      showToast('Failed to approve: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">🔍 Marking Review</h2>
        <div className="flex gap-4 text-sm text-slate-500">
          <span>Total: <b className="text-slate-800">{stats.total}</b></span>
          <span>Corrected: <b className="text-green-600">{stats.corrected}</b></span>
          <span>Pending: <b className="text-amber-600">{stats.pending}</b></span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field text-sm"
        >
          <option value="all">All Records</option>
          <option value="pending">Needs Review</option>
          <option value="corrected">Already Corrected</option>
        </select>
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="input-field text-sm"
        >
          <option value="all">All Subjects</option>
          <option value="CHM">Chemistry</option>
          <option value="BIO">Biology</option>
          <option value="MAT">Mathematics</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="input-field text-sm w-40"
        />
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} shown</span>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List panel */}
        <div className="card overflow-hidden lg:col-span-1">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 font-medium text-sm text-slate-600">
            Training Records
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No records found</div>
            ) : (
              filtered.map(r => (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`px-4 py-3 cursor-pointer transition hover:bg-slate-50 ${
                    selectedId === r.id ? 'bg-teal-50 border-l-2 border-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-800 truncate max-w-[180px]">
                      {r.test_context || 'Unknown'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        r.was_corrected
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {r.was_corrected ? 'Corrected' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>{r.subject || '—'}</span>
                    <span className="mono">
                      {r.total_marks}/{r.max_marks} ({r.percentage ? Math.round(r.percentage) : '—'}%)
                    </span>
                    <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card p-5 lg:col-span-2 max-h-[calc(100vh-280px)] overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Select a record to review
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-800">{selected.test_context || 'Unknown'}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selected.subject || '—'} · {selected.school || '—'} ·{' '}
                    {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Original: <span className="mono font-medium">{selected.total_marks}/{selected.max_marks}</span>
                    {' '}({selected.percentage ? Math.round(selected.percentage) : '—'}%)
                    {selected.was_corrected && (
                      <span className="ml-2 text-amber-600">· Previously corrected</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={Object.keys(editedQuestions).length === 0}
                    className="btn-secondary text-sm"
                  >
                    Reset
                  </button>
                  {!selected.was_corrected && (
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="btn-secondary text-sm"
                    >
                      ✓ Approve
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || Object.keys(editedQuestions).length === 0}
                    className="btn-primary text-sm"
                  >
                    {saving ? 'Saving...' : 'Save Corrections'}
                  </button>
                </div>
              </div>

              {/* Images */}
              {selected.image_urls?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Student Work ({selected.image_urls.length} images)
                  </h4>
                  <div className="flex gap-3 flex-wrap">
                    {selected.image_urls.map((path, i) => (
                      <a
                        key={i}
                        href={getStorageUrl(path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={getStorageUrl(path)}
                          alt={`Page ${i + 1}`}
                          className="max-w-[180px] max-h-[240px] rounded border border-slate-200 hover:border-teal-400 transition cursor-zoom-in"
                          onError={e => (e.target.style.opacity = '0.3')}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Questions ({selected.questions?.length || 0})
                </h4>
                {(selected.questions || []).length === 0 ? (
                  <p className="text-slate-400 text-sm">No questions found</p>
                ) : (
                  <div className="space-y-3">
                    {selected.questions.map((q, idx) => {
                      const edited = editedQuestions[idx];
                      const marks = edited?.marks ?? q.marks ?? q.marks_awarded ?? 0;
                      const maxMarks = q.max ?? q.max_marks ?? q.marks_available ?? 1;
                      const feedback = edited?.feedback ?? q.feedback ?? q.error_notes ?? '';
                      const misconception =
                        edited?.misconception ?? q.issue ?? q.tag ?? q.misconception ?? q.misconception_freetext ?? '';
                      const isEdited = !!edited;

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${
                            isEdited
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          {/* Question header */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-sm text-slate-700">
                              Q{q.question_number || idx + 1}
                              {q.part || ''}
                            </span>
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                value={marks}
                                onChange={e => handleEditQuestion(idx, 'marks', e.target.value)}
                                className="w-12 px-2 py-1 rounded border border-slate-200 text-center mono font-medium focus:outline-none focus:ring-1 focus:ring-teal-400"
                              />
                              <span className="text-slate-400">/ {maxMarks}</span>
                            </div>
                          </div>

                          {/* Question text (if available) */}
                          {q.question_text && (
                            <p className="text-sm text-slate-500 italic mb-3">{q.question_text}</p>
                          )}

                          {/* Feedback */}
                          <div className="mb-2">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                              Feedback
                            </label>
                            <textarea
                              value={feedback}
                              onChange={e => handleEditQuestion(idx, 'feedback', e.target.value)}
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
                              rows={2}
                            />
                          </div>

                          {/* Misconception */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                              Misconception / Error Pattern
                            </label>
                            <textarea
                              value={misconception}
                              onChange={e => handleEditQuestion(idx, 'misconception', e.target.value)}
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-slate-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
