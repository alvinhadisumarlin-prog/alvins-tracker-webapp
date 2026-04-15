'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseQB } from '@/lib/supabaseQB';
import SyntheticCard from '@/components/synthetic/SyntheticCard';
import SyntheticDetailModal from '@/components/synthetic/SyntheticDetailModal';

export default function SyntheticReviewPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, reviewed, flagged, unreviewed
  
  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Load data
  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabaseQB
        .from('synthetic_training_review')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Compute filter options from data
  const subjects = useMemo(() => {
    return [...new Set(records.map(r => r.subject).filter(Boolean))].sort();
  }, [records]);

  const qualities = useMemo(() => {
    return [...new Set(records.map(r => r.answer_quality).filter(Boolean))];
  }, [records]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    let filtered = records;
    
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(r => r.subject === subjectFilter);
    }
    
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(r => r.answer_quality === qualityFilter);
    }
    
    if (statusFilter === 'reviewed') {
      filtered = filtered.filter(r => r.reviewed);
    } else if (statusFilter === 'flagged') {
      filtered = filtered.filter(r => r.flagged);
    } else if (statusFilter === 'unreviewed') {
      filtered = filtered.filter(r => !r.reviewed && !r.flagged);
    }
    
    return filtered;
  }, [records, subjectFilter, qualityFilter, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: records.length,
      reviewed: records.filter(r => r.reviewed).length,
      flagged: records.filter(r => r.flagged).length,
      corrected: records.filter(r => r.corrected).length,
    };
  }, [records]);

  // Actions
  async function handleMarkReviewed(id) {
    const { error } = await supabaseQB
      .from('synthetic_training')
      .update({ reviewed: true, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      setRecords(prev => prev.map(r => 
        r.id === id ? { ...r, reviewed: true, reviewed_at: new Date().toISOString() } : r
      ));
      setSelectedRecord(null);
    }
  }

  async function handleFlag(id, notes) {
    const { error } = await supabaseQB
      .from('synthetic_training')
      .update({ flagged: true, flag_notes: notes })
      .eq('id', id);
    
    if (!error) {
      setRecords(prev => prev.map(r => 
        r.id === id ? { ...r, flagged: true, flag_notes: notes } : r
      ));
      setSelectedRecord(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this synthetic training record? This cannot be undone.')) return;
    
    const { error } = await supabaseQB
      .from('synthetic_training')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedRecord(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#3d6b5e] rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Synthetic Training Review</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review AI-generated training examples before export
          </p>
        </div>
        <button 
          onClick={loadRecords}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">Total Records</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.reviewed}</div>
          <div className="text-xs text-slate-500 mt-1">Reviewed ✓</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.flagged}</div>
          <div className="text-xs text-slate-500 mt-1">Flagged 🚩</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.corrected}</div>
          <div className="text-xs text-slate-500 mt-1">Corrected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Subject Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 uppercase">Subject</span>
          <button
            onClick={() => setSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              subjectFilter === 'all' 
                ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
            }`}
          >
            All
          </button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                subjectFilter === s 
                  ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Quality Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 uppercase">Quality</span>
          <button
            onClick={() => setQualityFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              qualityFilter === 'all' 
                ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
            }`}
          >
            All
          </button>
          {qualities.map(q => (
            <button
              key={q}
              onClick={() => setQualityFilter(q)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                qualityFilter === q 
                  ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
              }`}
            >
              {q.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 uppercase">Status</span>
          {['all', 'unreviewed', 'reviewed', 'flagged'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                statusFilter === s 
                  ? 'bg-[#3d6b5e] text-white border-[#3d6b5e]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#4a8b7f]'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Training Records
        </h2>
        <span className="text-sm text-slate-400">
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-4">🔬</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {records.length === 0 ? 'No Synthetic Training Data Yet' : 'No Records Match Filters'}
          </h2>
          <p className="text-slate-600">
            {records.length === 0 
              ? 'Use the synthetic-training-generator skill in Claude to create training examples.'
              : 'Try adjusting your filters to see more records.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => (
            <SyntheticCard 
              key={record.id} 
              record={record}
              onClick={() => setSelectedRecord(record)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <SyntheticDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onMarkReviewed={() => handleMarkReviewed(selectedRecord.id)}
          onFlag={(notes) => handleFlag(selectedRecord.id, notes)}
          onDelete={() => handleDelete(selectedRecord.id)}
        />
      )}
    </div>
  );
}
