import { subjectPillClass, subjectLabel } from '@/lib/helpers';

export default function SubjectPill({ subject }) {
  return (
    <span className={`pill ${subjectPillClass(subject)}`}>
      {subjectLabel(subject)}
    </span>
  );
}
