import { supabase } from './supabase';
import { parseClassCode } from './helpers';
import { TEST_STATUSES } from './constants';

// ============ STUDENT MANAGEMENT ============

// Update student fields (name, grad_year, class_codes)
export async function updateStudent(studentId, updates) {
  // updates can include: { name?, grad_year?, class_codes? }
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId)
    .select();

  if (error) {
    console.error('updateStudent error:', error);
    alert('Failed to update student: ' + error.message);
    return null;
  }
  if (!data || data.length === 0) {
    alert('Update failed: no rows updated. Check RLS policies.');
    return null;
  }
  return data[0];
}

// Exclude a student (soft-delete + blocklist from future seeding)
export async function excludeStudent(studentId) {
  const { data, error } = await supabase
    .from('students')
    .update({ is_excluded: true })
    .eq('id', studentId)
    .select();

  if (error) {
    console.error('excludeStudent error:', error);
    alert('Failed to exclude student: ' + error.message);
    return null;
  }
  return data?.[0] || null;
}

// Bulk exclude multiple students
export async function bulkExcludeStudents(studentIds) {
  if (!studentIds.length) return { success: 0, failed: 0 };
  
  const { data, error } = await supabase
    .from('students')
    .update({ is_excluded: true })
    .in('id', studentIds)
    .select();

  if (error) {
    console.error('bulkExcludeStudents error:', error);
    alert('Failed to exclude students: ' + error.message);
    return { success: 0, failed: studentIds.length };
  }
  return { success: data?.length || 0, failed: studentIds.length - (data?.length || 0) };
}

// Bulk add a class code to multiple students
export async function bulkAddClassCode(studentIds, classCode, currentStudents) {
  if (!studentIds.length || !classCode) return { success: 0, failed: 0 };
  
  let success = 0;
  let failed = 0;
  
  // We need to merge the new class code with existing ones for each student
  for (const studentId of studentIds) {
    const student = currentStudents.find(s => s.id === studentId);
    if (!student) {
      failed++;
      continue;
    }
    
    const existingCodes = student.class_codes || [];
    if (existingCodes.includes(classCode)) {
      // Already has this code, count as success
      success++;
      continue;
    }
    
    const newCodes = [...existingCodes, classCode];
    const { error } = await supabase
      .from('students')
      .update({ class_codes: newCodes })
      .eq('id', studentId);
    
    if (error) {
      console.error(`Failed to add class code to ${student.name}:`, error);
      failed++;
    } else {
      success++;
    }
  }
  
  return { success, failed };
}

// Restore an excluded student
export async function restoreStudent(studentId) {
  const { data, error } = await supabase
    .from('students')
    .update({ is_excluded: false })
    .eq('id', studentId)
    .select();

  if (error) {
    console.error('restoreStudent error:', error);
    alert('Failed to restore student: ' + error.message);
    return null;
  }
  return data?.[0] || null;
}

// Fetch excluded students (for the "Excluded" view)
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

// ============ TEST ASSIGNMENTS (class-level) ============

// Assign a class to a test — creates a test_assignments row
export async function assignClass(testId, classCode, dueDate = null) {
  const { data, error } = await supabase
    .from('test_assignments')
    .upsert(
      {
        test_id: testId,
        class_code: classCode,
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        status: 'assigned',
      },
      { onConflict: 'test_id,class_code' }
    )
    .select();

  if (error) {
    console.error('assignClass error:', error);
    alert('Failed to assign class: ' + error.message);
    return null;
  }
  return data?.[0] || null;
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
  const { error } = await supabase
    .from('test_assignments')
    .delete()
    .eq('test_id', testId)
    .eq('class_code', classCode);

  if (error) {
    console.error('removeClassAssignment error:', error);
    alert('Failed to remove assignment: ' + error.message);
    return false;
  }
  return true;
}

// ============ STATUS MANAGEMENT ============

// Set a specific status on an assignment
export async function setAssignmentStatus(testId, classCode, newStatus) {
  const updates = { status: newStatus };

  // Auto-set marking_done_date when completing
  if (newStatus === 'completed') {
    updates.marking_done_date = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('test_assignments')
    .update(updates)
    .eq('test_id', testId)
    .eq('class_code', classCode)
    .select();

  if (error) {
    console.error('setAssignmentStatus error:', error);
    alert('Failed to update status: ' + error.message);
    return null;
  }
  return data?.[0] || null;
}

// Cycle to the next status in the flow: assigned → marking → completed
export async function cycleAssignmentStatus(testId, classCode, currentStatus) {
  const idx = TEST_STATUSES.indexOf(currentStatus);
  const next = TEST_STATUSES[(idx + 1) % TEST_STATUSES.length];
  return setAssignmentStatus(testId, classCode, next);
}

// ============ DUE DATE ============

export async function setDueDate(testId, classCode, dueDate) {
  const { data, error } = await supabase
    .from('test_assignments')
    .update({ due_date: dueDate || null })
    .eq('test_id', testId)
    .eq('class_code', classCode)
    .select();

  if (error) {
    console.error('setDueDate error:', error);
    return null;
  }
  return data?.[0] || null;
}
