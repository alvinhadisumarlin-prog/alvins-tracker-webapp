'use client';

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

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: 'Overdue', urgent: true };
  } else if (diffDays === 0) {
    return { text: 'Due today', urgent: true };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', urgent: true };
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, urgent: false };
  } else {
    return { 
      text: `Due ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      urgent: false 
    };
  }
}

export default function TestCard({ assignment, status }) {
  const test = assignment.test || {};
  const isPending = status === 'pending';
  
  // Extract test code from canonical_name (e.g., "Homeostasis T-BIO-11" -> "T-BIO-11")
  const canonicalName = test.canonical_name || '';
  const testCodeMatch = canonicalName.match(/T-[A-Z]+-\d+/);
  const testCode = testCodeMatch ? testCodeMatch[0] : '';
  
  const dueInfo = isPending ? formatDueDate(assignment.due_date) : null;
  
  const submittedDate = assignment.submitted_at
    ? new Date(assignment.submitted_at).toLocaleDateString('en-GB')
    : null;

  return (
    <div 
      className={`bg-white border rounded-xl p-4 transition ${
        isPending 
          ? 'border-slate-200 hover:border-[#4a8b7f] hover:shadow-sm' 
          : 'border-slate-200 opacity-75'
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${getSubjectPillClass(test.subject)}`}>
              {test.subject}
            </span>
            {testCode && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {testCode}
              </span>
            )}
            {dueInfo && (
              <span className={`text-xs font-medium ${
                dueInfo.urgent ? 'text-red-600' : 'text-slate-500'
              }`}>
                • {dueInfo.text}
              </span>
            )}
            {submittedDate && (
              <span className="text-xs text-slate-400">
                • Submitted {submittedDate}
              </span>
            )}
          </div>
          
          {/* Test name */}
          <div className="font-medium text-slate-800">
            {test.display_name || 'Test'}
          </div>
          
          {/* Syllabus codes if available */}
          {test.syllabus_codes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {test.syllabus_codes.slice(0, 4).map((code, i) => (
                <span 
                  key={i}
                  className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded"
                >
                  {code}
                </span>
              ))}
              {test.syllabus_codes.length > 4 && (
                <span className="text-[10px] text-slate-400">
                  +{test.syllabus_codes.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-amber-200">
              Pending
            </span>
          ) : (
            <div className="flex items-center gap-1.5 text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Done</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
