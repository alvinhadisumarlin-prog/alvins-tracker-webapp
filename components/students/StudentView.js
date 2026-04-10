'use client';

export default function StudentView({ questions }) {
  if (!questions || !questions.length) {
    return <p className="text-sm text-slate-400 py-4">No question-level data for this result.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Question-by-Question Results</h3>
      {questions.map((q, i) => {
        if (q.correct) {
          return (
            <div key={i} className="q-card q-correct rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-green-800">Q{q.q}</span>
                <span className="mono text-sm font-semibold text-green-700">✓ {q.marks}/{q.max}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="q-card q-wrong rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-red-800">Q{q.q}</span>
              <span className="mono text-sm font-semibold text-red-700">✗ {q.marks}/{q.max}</span>
            </div>
            {q.issue && (
              <div className="text-sm text-red-700"><span className="font-medium">→</span> {q.issue}</div>
            )}
            {q.expected && (
              <div className="text-sm text-slate-700"><span className="font-medium text-slate-500">Expected:</span> {q.expected}</div>
            )}
            {q.explanation && (
              <div className="text-sm text-slate-600"><span className="text-slate-400">💡</span> {q.explanation}</div>
            )}
            {q.tip && (
              <div className="text-sm text-blue-700"><span className="text-blue-400">📝</span> {q.tip}</div>
            )}
            {q.remediation && (
              <div className="text-sm text-purple-700"><span className="text-purple-400">📖</span> {q.remediation}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
