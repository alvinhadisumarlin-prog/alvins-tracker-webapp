'use client';
import { useState } from 'react';

function getSubjectPillClass(subject) {
  switch (subject?.toUpperCase()) {
    case 'BIO': return 'bg-green-100 text-green-700';
    case 'CHM': return 'bg-blue-100 text-blue-700';
    case 'MATH': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getQualityBadge(quality) {
  switch (quality) {
    case 'perfect': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Perfect (100%)' };
    case 'partial_high': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial High (60-80%)' };
    case 'partial_low': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial Low (20-50%)' };
    case 'wrong': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Wrong (0-20%)' };
    default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: quality || 'Unknown' };
  }
}

function getScoreColor(pct) {
  if (pct >= 70) return 'text-green-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function SyntheticDetailModal({ record, onClose, onMarkReviewed, onFlag, onDelete }) {
  const [flagMode, setFlagMode] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [activeTab, setActiveTab] = useState('answer'); // answer, marking, json
  
  const qualityBadge = getQualityBadge(record.answer_quality);
  const pct = record.percentage || (record.max_marks > 0 ? Math.round((record.total_marks / record.max_marks) * 100) : 0);

  function handleFlagSubmit() {
    if (flagNotes.trim()) {
      onFlag(flagNotes.trim());
    }
  }

  function copyId() {
    navigator.clipboard.writeText(record.id);
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${getSubjectPillClass(record.subject)}`}>
                  {record.subject}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                  {record.external_id}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${qualityBadge.bg} ${qualityBadge.text}`}>
                  {qualityBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xl font-bold ${getScoreColor(pct)}`}>
                  {record.total_marks}/{record.max_marks} ({pct}%)
                </span>
                {record.reviewed && <span className="text-green-600 text-sm font-medium">✓ Reviewed</span>}
                {record.flagged && <span className="text-amber-600 text-sm font-medium">🚩 Flagged</span>}
                {record.corrected && <span className="text-blue-600 text-sm font-medium">📝 Corrected</span>}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          {/* UUID + copy button */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">{record.id}</span>
            <button 
              onClick={copyId}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline"
            >
              Copy ID
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 flex gap-4 flex-shrink-0">
          {['answer', 'marking', 'json'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-[#3d6b5e] text-[#3d6b5e]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'answer' ? 'Answer & Question' : tab === 'marking' ? 'Marking Output' : 'Raw JSON'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'answer' && (
            <div className="space-y-6">
              {/* Question Stem */}
              {record.question_stem && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Question</h3>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap">
                    {record.question_stem}
                  </div>
                </div>
              )}

              {/* Mark Scheme */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Mark Scheme</h3>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono">
                  {record.mark_scheme_text || 'Not available'}
                </div>
              </div>

              {/* Synthetic Answer */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Synthetic Answer</h3>
                <div className={`rounded-lg p-4 text-sm whitespace-pre-wrap ${
                  record.answer_quality === 'perfect' ? 'bg-green-50 text-green-800 border border-green-200' :
                  record.answer_quality === 'partial_high' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  record.answer_quality === 'partial_low' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {record.synthetic_answer}
                </div>
              </div>

              {/* Seeded Misconception */}
              {record.seeded_misconception && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Seeded Misconception</h3>
                  <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                    {record.seeded_misconception}
                  </div>
                </div>
              )}

              {/* Syllabus Codes */}
              {record.syllabus_codes?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Syllabus Codes</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.syllabus_codes.map((code, i) => (
                      <span key={i} className="text-sm font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'marking' && (
            <div className="space-y-6">
              {/* Questions array */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Marking Output (questions)</h3>
                <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 overflow-x-auto">
                  {JSON.stringify(record.questions, null, 2)}
                </pre>
              </div>

              {/* Tracker data */}
              {record.tracker_data && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tracker Data</h3>
                  <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 overflow-x-auto">
                    {JSON.stringify(record.tracker_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Full Record</h3>
              <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(record, null, 2)}
              </pre>
            </div>
          )}

          {/* Flag notes display */}
          {record.flagged && record.flag_notes && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-amber-700 uppercase mb-2">Flag Notes</h3>
              <p className="text-sm text-amber-800">{record.flag_notes}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          {flagMode ? (
            <div className="space-y-3">
              <textarea
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="Describe the issue (e.g., 'Marking too lenient, should be 2/5 not 4/5')"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3d6b5e]"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleFlagSubmit}
                  disabled={!flagNotes.trim()}
                  className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Submit Flag
                </button>
                <button
                  onClick={() => { setFlagMode(false); setFlagNotes(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {!record.reviewed && (
                  <button
                    onClick={onMarkReviewed}
                    className="px-4 py-2 text-sm font-medium bg-[#3d6b5e] text-white rounded-lg hover:bg-[#325a4f] transition"
                  >
                    ✓ Mark Reviewed
                  </button>
                )}
                {!record.flagged && (
                  <button
                    onClick={() => setFlagMode(true)}
                    className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition"
                  >
                    🚩 Flag for Review
                  </button>
                )}
              </div>
              <button
                onClick={onDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
