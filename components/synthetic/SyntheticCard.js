'use client';

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
    case 'perfect':
      return { bg: 'bg-green-100', text: 'text-green-700', label: '100%' };
    case 'partial_high':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: '60-80%' };
    case 'partial_low':
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: '20-50%' };
    case 'wrong':
      return { bg: 'bg-red-100', text: 'text-red-700', label: '0-20%' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-600', label: quality || '?' };
  }
}

function getScoreColor(pct) {
  if (pct >= 70) return 'text-green-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function SyntheticCard({ record, onClick }) {
  const qualityBadge = getQualityBadge(record.answer_quality);
  const pct = record.percentage || (record.max_marks > 0 ? Math.round((record.total_marks / record.max_marks) * 100) : 0);
  
  const date = record.created_at 
    ? new Date(record.created_at).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer transition hover:border-[#4a8b7f] hover:shadow-sm"
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-4">
        {/* Left side - main info */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${getSubjectPillClass(record.subject)}`}>
              {record.subject}
            </span>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              {record.external_id}
            </span>
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${qualityBadge.bg} ${qualityBadge.text}`}>
              {qualityBadge.label}
            </span>
            {record.reviewed && (
              <span className="text-[11px] font-medium text-green-600">✓ Reviewed</span>
            )}
            {record.flagged && (
              <span className="text-[11px] font-medium text-amber-600">🚩 Flagged</span>
            )}
            {record.corrected && (
              <span className="text-[11px] font-medium text-blue-600">📝 Corrected</span>
            )}
          </div>
          
          {/* Question stem preview */}
          {record.question_stem && (
            <div className="text-sm text-slate-700 mb-2">
              {truncate(record.question_stem, 120)}
            </div>
          )}
          
          {/* Synthetic answer preview */}
          <div className="text-sm text-slate-500 bg-slate-50 rounded p-2">
            <span className="text-slate-400 text-xs uppercase font-medium">Answer: </span>
            {truncate(record.synthetic_answer, 100)}
          </div>
          
          {/* Syllabus codes */}
          {record.syllabus_codes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {record.syllabus_codes.slice(0, 4).map((code, i) => (
                <span 
                  key={i}
                  className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded"
                >
                  {code}
                </span>
              ))}
              {record.syllabus_codes.length > 4 && (
                <span className="text-[10px] text-slate-400">
                  +{record.syllabus_codes.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side - score and meta */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-semibold ${getScoreColor(pct)}`}>
            {record.total_marks}/{record.max_marks}
          </div>
          <div className={`text-sm ${getScoreColor(pct)}`}>
            {pct}%
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {date}
          </div>
        </div>
      </div>
      
      {/* Seeded misconception if present */}
      {record.seeded_misconception && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Seeded misconception: </span>
          <span className="text-xs text-red-600">{record.seeded_misconception}</span>
        </div>
      )}
    </div>
  );
}
