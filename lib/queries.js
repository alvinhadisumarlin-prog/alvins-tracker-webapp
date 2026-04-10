import { supabase } from './supabase';

// ============ DATA FETCHING ============
export async function fetchAllData() {
  const [studentsRes, testsRes, resultsRes, assignmentsRes] = await Promise.all([
    // Filter: is_active = true AND is_excluded = false
    supabase.from('students').select('*').eq('is_active', true).eq('is_excluded', false).order('name'),
    supabase.from('active_tests').select('*').order('test_number', { ascending: false }),
    supabase.from('results').select('*').order('created_at', { ascending: false }),
    supabase.from('test_assignments').select('*').order('assigned_date', { ascending: false })
  ]);
  if (studentsRes.error) throw studentsRes.error;
  if (testsRes.error) throw testsRes.error;
  if (resultsRes.error) throw resultsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  return {
    students: studentsRes.data || [],
    tests: testsRes.data || [],
    results: resultsRes.data || [],
    testAssignments: assignmentsRes.data || []
  };
}

// ============ PURE QUERY HELPERS ============
// These accept the data arrays as params so they work with React state

export function getStudentResults(studentId, results) {
  return results.filter(r => r.student_id === studentId);
}

export function getTestResults(testId, results) {
  return results.filter(r => r.test_id === testId);
}

export function getTestById(testId, tests) {
  return tests.find(t => t.id === testId);
}

export function getStudentById(studentId, students) {
  return students.find(s => s.id === studentId);
}

export function getAllClassCodes(students) {
  const codes = new Set();
  students.forEach(s => (s.class_codes || []).forEach(c => codes.add(c)));
  return [...codes].sort();
}
