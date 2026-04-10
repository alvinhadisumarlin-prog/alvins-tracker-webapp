import { getTestById } from './queries';
import { sylName } from './syllabus';

// ============ PERCENTAGE HELPERS ============
export function pct(marks, total) {
  return total ? Math.round((marks / total) * 100) : 0;
}

export function pctColor(p) {
  return p >= 70 ? 'stat-green' : p >= 50 ? 'stat-amber' : 'stat-red';
}

export function pctIcon(p) {
  return p >= 70 ? '🟢' : p >= 50 ? '🟡' : '🔴';
}

export function pctBg(p) {
  return p >= 70 ? 'bg-green-50' : p >= 50 ? 'bg-amber-50' : 'bg-red-50';
}

// ============ FORMATTING ============
export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
}

export function testRef(test) {
  return `T-${test.subject}-${String(test.test_number).padStart(2, '0')}`;
}

// ============ CLASS CODE PARSING ============
export function parseClassCode(code) {
  const parts = (code || '').split('-');
  if (parts.length < 3) return { cohortYear: null, ibYear: null, subject: null, classNum: null };
  return {
    cohortYear: parts[0],
    ibYear: parts[1],     // IB1, IB2, IG3, JC1
    subject: parts[2],    // BIO, CHM, MATH
    classNum: parts[3] || null
  };
}

export function getStudentIBYear(student) {
  if (student.ib_year) return student.ib_year;
  const codes = student.class_codes || [];
  for (const c of codes) {
    const parsed = parseClassCode(c);
    if (parsed.ibYear) return parsed.ibYear;
  }
  return null;
}

export function getStudentSubjects(student) {
  return [...new Set((student.class_codes || []).map(c => parseClassCode(c).subject).filter(Boolean))];
}

// ============ PILL HELPERS ============
export function subjectPillClass(subj) {
  if (subj === 'BIO') return 'pill-bio';
  if (subj === 'CHM') return 'pill-chem';
  if (subj === 'MATH') return 'pill-math';
  return 'pill-ig';
}

export function subjectLabel(subj) {
  if (subj === 'BIO') return 'Biology';
  if (subj === 'CHM') return 'Chemistry';
  if (subj === 'MATH') return 'Math AA';
  if (subj === 'IGBIO') return 'IG Bio';
  return subj;
}

// ============ AGGREGATION ============
export function aggregateConceptsWrong(results) {
  const counts = {};
  results.forEach(r => {
    const td = r.tracker_data;
    if (!td) return;
    (td.concepts_wrong || []).forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function aggregateAO(results) {
  const ao = { AO1: 0, AO2: 0, AO3: 0 };
  results.forEach(r => {
    const td = r.tracker_data;
    if (!td || !td.ao_distribution) return;
    ao.AO1 += td.ao_distribution.AO1 || td.ao_distribution.ao1 || 0;
    ao.AO2 += td.ao_distribution.AO2 || td.ao_distribution.ao2 || 0;
    ao.AO3 += td.ao_distribution.AO3 || td.ao_distribution.ao3 || 0;
  });
  return ao;
}

export function studentAvg(studentId, results, tests) {
  const studentResults = results.filter(r => r.student_id === studentId);
  if (!studentResults.length) return null;
  const total = studentResults.reduce((sum, r) => {
    const test = getTestById(r.test_id, tests);
    return sum + pct(r.total_marks, test?.max_marks);
  }, 0);
  return Math.round(total / studentResults.length);
}

export function overallAvg(results, tests) {
  if (!results.length) return null;
  const total = results.reduce((sum, r) => {
    const test = getTestById(r.test_id, tests);
    return sum + pct(r.total_marks, test?.max_marks);
  }, 0);
  return Math.round(total / results.length);
}
