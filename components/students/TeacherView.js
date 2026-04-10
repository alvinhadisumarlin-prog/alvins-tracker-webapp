'use client';

export default function TeacherView({ tracker }) {
  if (!tracker || !Object.keys(tracker).length) {
    return <p className="text-sm text-slate-400 py-4">No tracker data for this result.</p>;
  }

  const errorAnalysis = tracker.error_analysis || [];
  const questionsWrong = tracker.questions_wrong || [];
  const conceptsWrong = tracker.concepts_wrong || [];
  const ao = tracker.ao_distribution || {};
  const aoTotal = (ao.AO1 || 0) + (ao.AO2 || 0) + (ao.AO3 || 0);
  const codes = tracker.syllabus_codes || [];

  const aoItems = [
    { key: 'AO1', bg: 'bg-blue-50', text: 'text-blue-700', sub: 'text-blue-500' },
    { key: 'AO2', bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-500' },
    { key: 'AO3', bg: 'bg-rose-50', text: 'text-rose-700', sub: 'text-rose-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'School', value: tracker.school },
          { label: 'Class', value: tracker.class_id, mono: true },
          { label: 'Year', value: tracker.year },
          { label: 'Codes', value: codes.join(', '), mono: true },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 uppercase">{label}</div>
            <div className={`font-semibold text-sm mt-1 ${mono ? 'mono' : ''}`}>{value || '-'}</div>
          </div>
        ))}
      </div>

      {/* AO Distribution */}
      {aoTotal > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AO Distribution (test marks)</h3>
          <div className="flex gap-3">
            {aoItems.map(({ key, bg, text, sub }) => (
              <div key={key} className={`flex-1 ${bg} rounded-lg px-3 py-2 text-center`}>
                <div className={`text-lg font-bold ${text}`}>{ao[key] || 0}</div>
                <div className={`text-xs ${sub}`}>{key}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions Wrong / Concepts Wrong */}
      {questionsWrong.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Questions Wrong:</span>
            <span className="ml-2 text-sm">
              {questionsWrong.map((q, i) => (
                <span key={i} className="mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs mr-1">{q}</span>
              ))}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Concepts Wrong:</span>
            <span className="ml-2 text-sm">
              {conceptsWrong.map((c, i) => (
                <span key={i} className="mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-xs mr-1">{c}</span>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Error Analysis */}
      {errorAnalysis.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Error Analysis</h3>
          <div className="space-y-4">
            {errorAnalysis.map((ea, i) => (
              <div key={i} className="card p-4" style={{ borderLeft: '4px solid #f87171' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="mono font-semibold text-sm text-red-700">{ea.question}</span>
                    <span className="mono text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{ea.concept}</span>
                  </div>
                  <span className="text-xs text-red-500 font-medium">-{ea.marks_lost} mark{ea.marks_lost !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 text-sm">
                  {ea.student_answer && (
                    <div>
                      <span className="font-medium text-slate-500">Student wrote:</span>
                      <span className="text-slate-700 ml-1">{ea.student_answer}</span>
                    </div>
                  )}
                  {ea.correct_answer && (
                    <div>
                      <span className="font-medium text-green-600">Expected:</span>
                      <span className="text-slate-700 ml-1">{ea.correct_answer}</span>
                    </div>
                  )}
                  {ea.analysis && (
                    <div>
                      <span className="font-medium text-slate-500">Analysis:</span>
                      <span className="text-slate-600 ml-1">{ea.analysis}</span>
                    </div>
                  )}
                  {ea.misconception && (
                    <div className="bg-amber-50 rounded px-3 py-2 mt-1">
                      <span className="font-medium text-amber-700">💭 Misconception:</span>
                      <span className="text-amber-800 ml-1">{ea.misconception}</span>
                    </div>
                  )}
                  {ea.remediation && (
                    <div className="bg-blue-50 rounded px-3 py-2">
                      <span className="font-medium text-blue-700">📖 Remediation:</span>
                      <span className="text-blue-800 ml-1">{ea.remediation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {tracker.notes && (
        <div className="bg-slate-50 rounded-lg p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Notes:</span>
          <p className="text-sm text-slate-700 mt-1">{tracker.notes}</p>
        </div>
      )}
    </div>
  );
}
