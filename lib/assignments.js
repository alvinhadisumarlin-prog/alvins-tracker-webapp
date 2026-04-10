import { parseClassCode } from './helpers';
import { getTestResults } from './queries';

// ============ READING ASSIGNMENTS ============

// Get test_assignments rows for a specific test
// testAssignments = full array fetched from Supabase
export function getAssignmentsForTest(testId, testAssignments) {
  return (testAssignments || []).filter((ta) => ta.test_id === testId);
}

// Build the per-student assignment map for a test.
// Merges test_assignments (class-level) with students (class membership) and results.
//
// Returns: { studentId: { class_code, assigned_date, due_date, status, marked, marked_at } }
//
// Parameters:
//   test            — the test object (needs .id, .subject)
//   students        — full students array
//   results         — full results array
//   testAssignments — full test_assignments array (all rows from Supabase)
//
export function getEffectiveAssignments(test, students, results, testAssignments) {
  const assignments = getAssignmentsForTest(test.id, testAssignments);
  const testResults = getTestResults(test.id, results);
  const effective = {};

  // Build a quick lookup: studentId → result
  const resultByStudent = {};
  testResults.forEach((r) => {
    resultByStudent[r.student_id] = r;
  });

  // 1. From test_assignments: find all students in each assigned class
  assignments.forEach((ta) => {
    const classStudents = students.filter((s) =>
      (s.class_codes || []).includes(ta.class_code)
    );

    classStudents.forEach((s) => {
      const result = resultByStudent[s.id];
      effective[s.id] = {
        class_code: ta.class_code,
        assigned_date: ta.assigned_date,
        due_date: ta.due_date,
        status: ta.status,
        marked: !!result,
        marked_at: result?.created_at || null,
        result_id: result?.id || null,
        total_marks: result?.total_marks ?? null,
      };
    });
  });

  // 2. Students with results but whose class wasn't explicitly assigned
  //    (e.g. result was inserted before the class was assigned)
  testResults.forEach((r) => {
    if (effective[r.student_id]) return; // already covered

    const student = students.find((s) => s.id === r.student_id);
    if (!student) return;

    const classCodes = (student.class_codes || []).filter(
      (c) => parseClassCode(c).subject === test.subject
    );

    effective[r.student_id] = {
      class_code: classCodes[0] || '',
      assigned_date: null,
      due_date: null,
      status: 'completed',
      marked: true,
      marked_at: r.created_at || null,
      result_id: r.id,
      total_marks: r.total_marks ?? null,
    };
  });

  return effective;
}

// Group assignments by class code
// Returns sorted array: [ [classCode, studentEntries[]] ]
export function groupByClass(assignments) {
  const byClass = {};
  Object.entries(assignments).forEach(([sid, info]) => {
    const cls = info.class_code || 'Unclassified';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push({ studentId: sid, ...info });
  });
  return Object.entries(byClass).sort((a, b) => a[0].localeCompare(b[0]));
}

// Check if a student is assigned to a test
export function isStudentAssigned(test, studentId, students, testAssignments) {
  const effective = getEffectiveAssignments(test, students, [], testAssignments);
  return !!effective[studentId];
}
