'use client';
import { useState, useEffect, useMemo } from 'react';
import { updateStudent, excludeStudent } from '@/lib/mutations';
import { getAllClassCodes } from '@/lib/queries';

export default function EditStudentModal({ student, allStudents, onClose, onSave, onExclude }) {
  const [name, setName] = useState(student.name || '');
  const [gradYear, setGradYear] = useState(student.grad_year || '');
  const [classCodes, setClassCodes] = useState(student.class_codes || []);
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmExclude, setConfirmExclude] = useState(false);

  // All existing class codes across all students (for suggestions)
  const existingCodes = useMemo(() => getAllClassCodes(allStudents), [allStudents]);

  // Grad year options (current year to +4 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4];

  function handleAddCode(code) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed && !classCodes.includes(trimmed)) {
      setClassCodes([...classCodes, trimmed]);
    }
    setNewCode('');
  }

  function handleRemoveCode(code) {
    setClassCodes(classCodes.filter(c => c !== code));
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    setSaving(true);
    const updates = {
      name: name.trim(),
      grad_year: gradYear ? parseInt(gradYear) : null,
      class_codes: classCodes,
    };
    const result = await updateStudent(student.id, updates);
    setSaving(false);
    if (result) {
      onSave(result);
    }
  }

  async function handleExclude() {
    if (!confirmExclude) {
      setConfirmExclude(true);
      return;
    }
    setSaving(true);
    const result = await excludeStudent(student.id);
    setSaving(false);
    if (result) {
      onExclude(result);
    }
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Edit Student</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Student name"
              />
            </div>

            {/* Grad Year */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Graduation Year</label>
              <select
                value={gradYear}
                onChange={e => setGradYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Not set</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Class Codes */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Class Codes</label>
              
              {/* Current codes as chips */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
                {classCodes.length === 0 && (
                  <span className="text-sm text-slate-400 italic">No class codes assigned</span>
                )}
                {classCodes.map(code => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                    style={{ background: '#dbeafe', color: '#1e40af' }}
                  >
                    {code}
                    <button
                      onClick={() => handleRemoveCode(code)}
                      className="text-blue-600 hover:text-blue-800 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add new code */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCode(newCode);
                    }
                  }}
                  placeholder="Add class code..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  list="existing-codes"
                />
                <datalist id="existing-codes">
                  {existingCodes.filter(c => !classCodes.includes(c)).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <button
                  onClick={() => handleAddCode(newCode)}
                  disabled={!newCode.trim()}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Quick add from existing */}
              {existingCodes.filter(c => !classCodes.includes(c)).length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-slate-400">Quick add: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingCodes.filter(c => !classCodes.includes(c)).slice(0, 8).map(code => (
                      <button
                        key={code}
                        onClick={() => handleAddCode(code)}
                        className="px-2 py-0.5 text-xs rounded border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                      >
                        + {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-2">
              <button
                onClick={() => setShowDangerZone(!showDangerZone)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <span>{showDangerZone ? '▼' : '▶'}</span>
                <span>Danger Zone</span>
              </button>

              {showDangerZone && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 mb-3">
                    Removing a student will hide them from the roster and prevent them from being re-added during future syncs.
                    Their test history will be preserved.
                  </p>
                  
                  {confirmExclude ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                      <button
                        onClick={handleExclude}
                        disabled={saving}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {saving ? 'Removing...' : 'Yes, remove'}
                      </button>
                      <button
                        onClick={() => setConfirmExclude(false)}
                        className="px-3 py-1.5 text-slate-600 text-xs font-medium hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleExclude}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                    >
                      🗑 Remove from roster
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
