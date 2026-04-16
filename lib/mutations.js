import { supabase } from './supabase';
import { parseClassCode } from './helpers';
import { TEST_STATUSES } from './constants';

// ============ ADMIN KEY MANAGEMENT ============

const EDGE_FUNCTION_URL =
  'https://ipjolefhnzwthmalripz.supabase.co/functions/v1/admin-test-assignments';

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

// Call the edge function with admin auth
async function adminFetch(body) {
  const adminKey = getAdminKey();
  if (!adminKey) {
    alert('Admin key required to make changes');
    return { success: false, error: 'No admin key' };
  }

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      // If unauthorized, clear the stored key so user can re-enter
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

// ============ TEST ASSIGNMENTS (class-level) ============

// Assign a class to a test — creates a test_assignments row
export async function assignClass(testId, classCode, dueDate = null) {
  const result = await adminFetch({
    action: 'assign',
    test_id: testId,
    class_code: classCode,
    due_date: dueDate,
  });

  if (!result.success) {
    return null;
  }
  return result.data;
}

// Assign a single student to a test by assigning their class
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

// Bulk assign all students in a class (same as assignClass — students are inferred from class membership)
export async function bulkAssignClass(testId, classCode, dueDate = null) {
  return assignClass(testId, classCode, dueDate);
}

// Remove a class assignment
export async function removeClassAssignment(testId, classCode) {
  const result = await adminFetch({
    action: 'remove',
    test_id: testId,
    class_code: classCode,
  });

  return result.success;
}

// ============ STATUS MANAGEMENT ============

// Set a specific status on an assignment
export async function setAssignmentStatus(testId, classCode, newStatus) {
  const result = await adminFetch({
    action: 'set_status',
    test_id: testId,
    class_code: classCode,
    status: newStatus,
  });

  if (!result.success) {
    return null;
  }
  return result.data;
}

// Cycle to the next status in the flow: assigned → marking → completed
export async function cycleAssignmentStatus(testId, classCode, currentStatus) {
  const idx = TEST_STATUSES.indexOf(currentStatus);
  const next = TEST_STATUSES[(idx + 1) % TEST_STATUSES.length];
  return setAssignmentStatus(testId, classCode, next);
}

// ============ DUE DATE ============

export async function setDueDate(testId, classCode, dueDate) {
  const result = await adminFetch({
    action: 'set_due_date',
    test_id: testId,
    class_code: classCode,
    due_date: dueDate || null,
  });

  if (!result.success) {
    return null;
  }
  return result.data;
}
