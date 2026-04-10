import { supabase } from './supabase';

const STORAGE_BUCKET = 'training-data';

// ============ HELPERS ============

// Convert relative Storage path to full URL
export function getStorageUrl(relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const baseUrl = supabase.supabaseUrl || 'https://ipjolefhnzwthmalripz.supabase.co';
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${relativePath}`;
}

// ============ QUERIES ============

// Fetch all training data records
export async function fetchTrainingData() {
  const { data, error } = await supabase
    .from('training_data')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchTrainingData error:', error);
    return [];
  }
  return data || [];
}

// Fetch a single training data record by ID
export async function fetchTrainingRecord(id) {
  const { data, error } = await supabase
    .from('training_data')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('fetchTrainingRecord error:', error);
    return null;
  }
  return data;
}

// ============ MUTATIONS ============

// Save corrections to a training data record
export async function saveCorrections(recordId, {
  updatedQuestions,
  newCorrections,
  newTotalMarks,
  newPercentage,
}) {
  // Fetch existing record to merge corrections
  const existing = await fetchTrainingRecord(recordId);
  if (!existing) {
    throw new Error('Record not found');
  }

  const allCorrections = [...(existing.tutor_corrections || []), ...newCorrections];

  const { data, error } = await supabase
    .from('training_data')
    .update({
      questions: updatedQuestions,
      tutor_corrections: allCorrections,
      was_corrected: true,
      total_marks: newTotalMarks,
      percentage: newPercentage,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    console.error('saveCorrections error:', error);
    throw error;
  }
  return data;
}

// Mark a record as reviewed without changes (approve as-is)
export async function approveAsIs(recordId) {
  const { data, error } = await supabase
    .from('training_data')
    .update({
      was_corrected: true,
      tutor_corrections: [{ action: 'approved_as_is', approved_at: new Date().toISOString() }],
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    console.error('approveAsIs error:', error);
    throw error;
  }
  return data;
}
