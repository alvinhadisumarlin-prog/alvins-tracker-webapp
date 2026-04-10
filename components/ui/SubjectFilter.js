'use client';
import { getSubjectMeta } from '@/lib/constants';

export default function SubjectFilter({ subjects, selected, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg p-0.5" style={{ background: '#f1f5f9' }}>
      {subjects.map(subj => {
        const meta = getSubjectMeta(subj);
        const isActive = selected === subj;
        return (
          <button
            key={subj}
            onClick={() => onChange(subj)}
            className="px-3.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all border-none"
            style={{
              fontFamily: 'inherit',
              ...(isActive
                ? { background: meta.activeBg, color: 'white' }
                : { background: 'transparent', color: meta.color })
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
