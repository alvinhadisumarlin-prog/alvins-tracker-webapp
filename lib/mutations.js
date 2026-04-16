import { supabase } from './supabase';
import { parseClassCode } from './helpers';
import { TEST_STATUSES } from './constants';

// ============ ADMIN API CLIENT ============

const ADMIN_API_URL =
  'https://ipjolefhnzwthmalripz.supabase.co/functions/v1/admin-api';

// Get admin key from localStorage, or prompt user
function getAdminKey() {
  let key = localStorage.getItem('admin_key');
  if (!key) {
    key = prompt('Enter admin key to make changes:');
    if (key) {
      localStorage.setItem('admin_key', key);
    }
  }
  return key;
}

// Clear admin key (call this if auth fails)
export function clearAdminKey() {
  localStorage.removeItem('admin_key');
}

// Call the admin API
async function adminFetch(body) {
  const adminKey = getAdminKey();
  if (!adminKey) {
    alert('Admin key required to make changes');
    return { success: false, error: 'No admin key' };
  }

  try {
    const res = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        clearAdminKey();
        alert('Invalid admin key. Please try again.');
      } else {
        alert('Operation failed: ' + (json.error || res.statusText));
      }
      return { success: false, error: json.error };
    }

    return json;
  } catch (err) {
    console.error('adminFetch error:', err);
    alert('Network error: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ============ TEST ASSIGNMENTS ============

export async function assignClass(testId, classCode, dueDate = null) {
  const result = await adminFetch({
    action: 'assign_class',
    test_id: testId,
    class_code: classCode,
    due_date: dueDate,
  });
  return result.success ? result.data : null;
}

export async function assignStudent(test, studentId, students, dueDate = null) {
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const classCodes = (student.class_codes || []).filter(
    (c) => parseClassCode(c).subject === test.subject
  );
  if (classCodes.length === 0) {
    alert(`${student.name} has no class code for ${test.subject}`);
    return null;
  }

  return assignClass(test.id, classCodes[0], dueDate);
}

export async function bulkAssignClass(testId, classCode, dueDate = null) {
  return assignClass(testId, classCode, dueDate);
}

export async function removeClassAssignment(testId, classCode) {
  const result = await adminFetch({
    table: 'test_assignments',
    action: 'delete',
    filters: { test_id: testId, class_code: classCode },
  });
  return result.success;
}

export async function setAssignmentStatus(testId, classCode, newStatus) {
  const result = await adminFetch({
    action: 'set_assignment_status',
    test_id: testId,
    class_code: classCode,
    status: newStatus,
  });
  return result.success ? result.data : null;
}

export async function cycleAssignmentStatus(testId, classCode, currentStatus) {
  const idx = TEST_STATUSES.indexOf(currentStatus);
  const next = TEST_STATUSES[(idx + 1) % TEST_STATUSES.length];
  return setAssignmentStatus(testId, classCode, next);
}

export async function setDueDate(testId, classCode, dueDate) {
  const result = await adminFetch({
    table: 'test_assignments',
    action: 'update',
    data: { due_date: dueDate || null },
    filters: { test_id: testId, class_code: classCode },
  });
  return result.success ? result.data?.[0] : null;
}

// ============ STUDENTS ============

// Fetch excluded students (read-only, uses anon key)
export async function fetchExcludedStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('is_excluded', true)
    .order('name');
  
  if (error) {
    console.error('fetchExcludedStudents error:', error);
    return [];
  }
  return data || [];
}

// Restore an excluded student
export async function restoreStudent(studentId) {
  return excludeStudent(studentId, false);
}

// Bulk exclude multiple students
export async function bulkExcludeStudents(studentIds) {
  let success = 0;
  let failed = 0;
  
  for (const id of studentIds) {
    const result = await excludeStudent(id, true);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}

// Bulk add class code to multiple students
export async function bulkAddClassCode(studentIds, classCode, allStudents) {
  let success = 0;
  let failed = 0;
  
  for (const id of studentIds) {
    const student = allStudents.find(s => s.id === id);
    if (!student) {
      failed++;
      continue;
    }
    
    const currentCodes = student.class_codes || [];
    if (currentCodes.includes(classCode)) {
      success++; // Already has it, count as success
      continue;
    }
    
    const newCodes = [...currentCodes, classCode];
    const result = await updateStudent(id, { class_codes: newCodes });
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}

export async function excludeStudent(studentId, exclude = true) {
  const result = await adminFetch({
    action: 'exclude_student',
    student_id: studentId,
    exclude,
  });
  return result.success ? result.data : null;
}

export async function setStudentClassCodes(studentId, classCodes) {
  const result = await adminFetch({
    action: 'set_student_class_codes',
    student_id: studentId,
    class_codes: classCodes,
  });
  return result.success ? result.data : null;
}

export async function bulkSetClassCode(studentIds, classCode, replace = false) {
  const result = await adminFetch({
    action: 'bulk_set_class_code',
    student_ids: studentIds,
    class_code: classCode,
    replace,
  });
  return result.success ? result.data : null;
}

export async function updateStudent(studentId, updates) {
  const result = await adminFetch({
    table: 'students',
    action: 'update',
    data: updates,
    filters: { id: studentId },
  });
  return result.success ? result.data?.[0] : null;
}

export async function bulkUpdateStudents(studentIds, updates) {
  const result = await adminFetch({
    table: 'students',
    action: 'bulk_update',
    ids: studentIds,
    data: updates,
  });
  return result.success ? result.data : null;
}

// ============ ACTIVE TESTS ============

export async function createTest(testData) {
  const result = await adminFetch({
    action: 'create_test',
    test_data: testData,
  });
  return result.success ? result.data : null;
}

export async function updateTest(testId, updates) {
  const result = await adminFetch({
    action: 'update_test',
    test_id: testId,
    updates,
  });
  return result.success ? result.data : null;
}

export async function setTestPdf(testId, pdfUrl) {
  const result = await adminFetch({
    action: 'set_test_pdf',
    test_id: testId,
    pdf_url: pdfUrl,
  });
  return result.success ? result.data : null;
}

export async function deleteTest(testId) {
  const result = await adminFetch({
    table: 'active_tests',
    action: 'delete',
    filters: { id: testId },
  });
  return result.success;
}

// ============ RESULTS ============

export async function insertResult(resultData) {
  const result = await adminFetch({
    action: 'insert_result',
    result_data: resultData,
  });
  return result.success ? result.data : null;
}

export async function deleteResult(resultId) {
  const result = await adminFetch({
    action: 'delete_result',
    result_id: resultId,
  });
  return result.success;
}

export async function updateResult(resultId, updates) {
  const result = await adminFetch({
    table: 'results',
    action: 'update',
    data: updates,
    filters: { id: resultId },
  });
  return result.success ? result.data?.[0] : null;
}

// ============ SUBMISSIONS ============

export async function updateSubmissionStatus(submissionId, status) {
  const result = await adminFetch({
    table: 'submissions',
    action: 'update',
    data: { status },
    filters: { id: submissionId },
  });
  return result.success ? result.data?.[0] : null;
}

// ============ TRAINING DATA ============

export async function addTutorCorrection(trainingId, correction) {
  const result = await adminFetch({
    action: 'add_tutor_correction',
    training_id: trainingId,
    correction,
  });
  return result.success ? result.data : null;
}

// ============ GENERIC OPERATIONS ============

// For any table operation not covered above
export async function adminInsert(table, data) {
  const result = await adminFetch({
    table,
    action: 'insert',
    data,
  });
  return result.success ? result.data : null;
}

export async function adminUpdate(table, filters, data) {
  const result = await adminFetch({
    table,
    action: 'update',
    data,
    filters,
  });
  return result.success ? result.data : null;
}

export async function adminDelete(table, filters) {
  const result = await adminFetch({
    table,
    action: 'delete',
    filters,
  });
  return result.success;
}

export async function adminUpsert(table, data, onConflict = null) {
  const result = await adminFetch({
    table,
    action: 'upsert',
    data,
    on_conflict: onConflict,
  });
  return result.success ? result.data : null;
}
