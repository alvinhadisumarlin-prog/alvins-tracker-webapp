'use client';
import { useState } from 'react';

function getScoreColor(pct) {
  if (pct >= 70) return 'text-green-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function getSubjectPillClass(subject) {
  switch (subject?.toUpperCase()) {
    case 'BIO': return 'bg-green-100 text-green-700';
    case 'CHM': return 'bg-blue-100 text-blue-700';
    case 'MAA':
    case 'MAI':
    case 'MATH': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export default function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  
  const test = result.active_tests || {};
  const pct = result.percentage || 0;
  const tracker = result.tracker_data || {};
  
  // Extract test code from canonical_name (e.g., "T-BIO-14")
  const canonicalName = test.canonical_name || '';
  const testCodeMatch = canonicalName.match(/T-[A-Z]+-\d+$/);
  const testCode = testCodeMatch ? testCodeMatch[0] : '';
  
  const date = result.created_at 
    ? new Date(result.created_at).toLocaleDateString('en-GB')
    : '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden transition hover:border-slate-300">
      {/* Summary Row */}
      <div 
        className="p-4 cursor-pointer flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${getSubjectPillClass(test.subject)}`}>
              {test.subject}
            </span>
            {testCode && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {testCode}
              </span>
            )}
            <span className="text-xs text-slate-400">{date}</span>
          </div>
          <div className="font-medium text-slate-800 truncate">
            {test.display_name || 'Test'}
          </div>
        </div>
        
        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <span className={`text-lg font-semibold ${getScoreColor(pct)}`}>
              {result.total_marks}/{test.max_marks}
            </span>
            <span className={`text-sm ml-2 ${getScoreColor(pct)}`}>
              {pct}%
            </span>
          </div>
          <span 
            className={`text-slate-400 text-xl transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50/50">
          {/* Areas to Review */}
          {tracker.concepts_wrong?.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Areas to Review
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tracker.concepts_wrong.map((code, i) => (
                  <span 
                    key={i}
                    className="bg-red-100 text-red-600 text-xs font-mono px-2 py-1 rounded-md"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question Breakdown */}
          {result.questions?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Question Breakdown
              </h3>
              <div className="space-y-2">
                {result.questions.map((q, i) => {
                  const hasFullMarks = q.marks === q.max;
                  const isCorrect = q.correct;
                  
                  return (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg border-l-4 ${
                        isCorrect 
                          ? 'border-l-green-500 bg-green-50' 
                          : 'border-l-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">{q.q}</span>
                        <span className="font-semibold text-slate-600">
                          {q.marks}/{q.max}
                        </span>
                      </div>
                      
                      {!hasFullMarks && (
                        <div className="mt-2 space-y-1.5 text-sm">
                          {q.question_text && (
                            <div className="bg-white/70 border border-red-200 rounded p-2 text-slate-700">
                              {q.question_text}
                            </div>
                          )}
                          {q.issue && (
                            <div className="text-red-600">→ {q.issue}</div>
                          )}
                          {q.expected && (
                            <div className="text-purple-600">→ Expected: {q.expected}</div>
                          )}
                          {q.explanation && (
                            <div className="bg-[#e8f4f1] text-[#3d6b5e] p-2 rounded">
                              💡 {q.explanation}
                            </div>
                          )}
                          {q.remediation && (
                            <div className="bg-blue-50 text-blue-700 p-2 rounded">
                              📝 {q.remediation}
                            </div>
                          )}
                          {q.tip && !q.explanation && (
                            <div className="bg-[#e8f4f1] text-[#3d6b5e] p-2 rounded">
                              💡 {q.tip}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No data fallback */}
          {!tracker.concepts_wrong?.length && !result.questions?.length && (
            <p className="text-slate-500 text-sm">No detailed breakdown available.</p>
          )}
        </div>
      )}
    </div>
  );
}
