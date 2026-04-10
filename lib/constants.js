export const TEST_STATUSES = ['assigned', 'marking', 'completed'];

export const STATUS_COLORS = {
  assigned: '#3b82f6',
  marking: '#f59e0b',
  completed: '#16a34a',
};

export const STATUS_LABELS = {
  assigned: 'Assigned',
  marking: 'Marking',
  completed: 'Completed',
};

export const SUBJECT_META = {
  BIO: { label: 'Biology', bg: '#dcfce7', color: '#166534', activeBg: '#166534' },
  CHM: { label: 'Chemistry', bg: '#dbeafe', color: '#1e40af', activeBg: '#1e40af' },
  MATH: { label: 'Math', bg: '#f3e8ff', color: '#6b21a8', activeBg: '#6b21a8' },
  IGBIO: { label: 'IG Bio', bg: '#fef3c7', color: '#92400e', activeBg: '#92400e' },
};

export function getSubjectMeta(subj) {
  return SUBJECT_META[subj] || { label: subj, bg: '#f1f5f9', color: '#64748b', activeBg: '#64748b' };
}
