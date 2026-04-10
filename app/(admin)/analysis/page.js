'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import SubjectPill from '@/components/ui/SubjectPill';
import { pct, pctColor, testRef, aggregateConceptsWrong, aggregateAO, subjectLabel } from '@/lib/helpers';
import { getTestResults, getTestById } from '@/lib/queries';
import { sylName } from '@/lib/syllabus';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function AnalysisPage() {
  const { students, tests, results } = useData();
  const [chartMode, setChartMode] = useState('chronological');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const weakConcepts = useMemo(() => aggregateConceptsWrong(results), [results]);
  const ao = useMemo(() => aggregateAO(results), [results]);
  const aoTotal = ao.AO1 + ao.AO2 + ao.AO3;

  const subjects = useMemo(() => [...new Set(tests.map(t => t.subject))], [tests]);

  const subjectStats = useMemo(() =>
    subjects.map(subj => {
      const subjTests = tests.filter(t => t.subject === subj);
      const subjTestIds = new Set(subjTests.map(t => t.id));
      const subjResults = results.filter(r => subjTestIds.has(r.test_id));
      const avgP = subjResults.length > 0
        ? Math.round(subjResults.reduce((sum, r) => {
            const test = getTestById(r.test_id, tests);
            return sum + pct(r.total_marks, test?.max_marks);
          }, 0) / subjResults.length)
        : null;
      const subjStudents = students.filter(s =>
        (s.class_codes || []).some(c => c.includes(subj))
      );
      return { subject: subj, tests: subjTests.length, results: subjResults.length, students: subjStudents.length, avg: avgP };
    }),
    [subjects, tests, results, students]
  );

  // Chart data
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const subjectColors = {
      BIO: { border: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
      CHM: { border: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
      MATH: { border: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
      IGBIO: { border: '#d97706', bg: 'rgba(217,119,6,0.1)' }
    };
    const defaultColor = { border: '#64748b', bg: 'rgba(100,116,139,0.1)' };

    if (chartMode === 'chronological') {
      const testTrend = tests
        .filter(t => getTestResults(t.id, results).length > 0)
        .sort((a, b) => a.test_number - b.test_number)
        .map(t => {
          const tResults = getTestResults(t.id, results);
          const avgP = Math.round(tResults.reduce((sum, r) => sum + pct(r.total_marks, t.max_marks), 0) / tResults.length);
          return { ref: testRef(t), avg: avgP };
        });
      if (testTrend.length < 2) return;

      chartInstance.current = new Chart(canvas, {
        type: 'line',
        data: {
          labels: testTrend.map(t => t.ref),
          datasets: [{
            label: 'Class Average %',
            data: testTrend.map(t => t.avg),
            borderColor: '#1e293b',
            backgroundColor: 'rgba(30,41,59,0.08)',
            fill: true, tension: 0.3,
            pointBackgroundColor: '#1e293b', pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } }
        }
      });
    } else {
      const datasets = [];
      let maxTests = 0;

      subjects.forEach(subj => {
        const subjTests = tests
          .filter(t => t.subject === subj && getTestResults(t.id, results).length > 0)
          .sort((a, b) => a.test_number - b.test_number)
          .map(t => {
            const tResults = getTestResults(t.id, results);
            const avgP = Math.round(tResults.reduce((sum, r) => sum + pct(r.total_marks, t.max_marks), 0) / tResults.length);
            return { ref: testRef(t), avg: avgP };
          });

        if (subjTests.length > 0) {
          maxTests = Math.max(maxTests, subjTests.length);
          const color = subjectColors[subj] || defaultColor;
          datasets.push({
            label: subjectLabel(subj),
            data: subjTests.map(t => t.avg),
            borderColor: color.border,
            backgroundColor: color.bg,
            fill: false, tension: 0.3,
            pointBackgroundColor: color.border, pointRadius: 5,
            _refs: subjTests.map(t => t.ref)
          });
        }
      });

      if (datasets.length === 0 || maxTests < 1) return;
      const labels = Array.from({ length: maxTests }, (_, i) => `Test ${i + 1}`);

      chartInstance.current = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
            tooltip: {
              callbacks: {
                title: function(ctx) {
                  const ds = ctx[0].dataset;
                  const idx = ctx[0].dataIndex;
                  return ds._refs ? ds._refs[idx] : ctx[0].label;
                }
              }
            }
          },
          scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartMode, tests, results, subjects]);

  const testsWithResults = tests.filter(t => getTestResults(t.id, results).length > 0);

  const aoItems = [
    { key: 'AO1', color: 'bg-blue-500' },
    { key: 'AO2', color: 'bg-purple-500' },
    { key: 'AO3', color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Subject Overview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Subject Overview</h3>
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(subjects.length, 4)} gap-4`}>
          {subjectStats.map(s => (
            <div key={s.subject} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <SubjectPill subject={s.subject} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">{s.students}</div>
                  <div className="text-xs text-slate-400">Students</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{s.tests}</div>
                  <div className="text-xs text-slate-400">Tests</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${s.avg !== null ? pctColor(s.avg) : 'text-slate-300'}`}>
                    {s.avg !== null ? s.avg + '%' : '-'}
                  </div>
                  <div className="text-xs text-slate-400">Avg</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AO + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AO Distribution */}
        {aoTotal > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">AO Distribution (marks lost)</h3>
            <div className="space-y-3">
              {aoItems.map(({ key, color }) => {
                const val = ao[key];
                const pctVal = aoTotal > 0 ? Math.round((val / aoTotal) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{key}</span>
                      <span className="text-slate-500">{val} marks ({pctVal}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pctVal}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Test Averages Chart */}
        {testsWithResults.length > 1 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Test Averages</h3>
              <div className="flex gap-1 rounded-md p-0.5" style={{ background: '#f1f5f9' }}>
                <button
                  onClick={() => setChartMode('chronological')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer border-none transition"
                  style={{
                    fontFamily: 'inherit',
                    ...(chartMode === 'chronological'
                      ? { background: '#1e293b', color: 'white' }
                      : { background: 'transparent', color: '#64748b' })
                  }}
                >By Test</button>
                <button
                  onClick={() => setChartMode('by_subject')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer border-none transition"
                  style={{
                    fontFamily: 'inherit',
                    ...(chartMode === 'by_subject'
                      ? { background: '#1e293b', color: 'white' }
                      : { background: 'transparent', color: '#64748b' })
                  }}
                >By Subject</button>
              </div>
            </div>
            <canvas ref={chartRef} height={200} />
          </div>
        )}
      </div>

      {/* Weak Concepts Grid */}
      {weakConcepts.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">All Weak Concepts (class-wide)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {weakConcepts.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <span>
                  <span className="mono text-amber-700 font-medium text-sm">{code}</span>
                  <span className="text-slate-600 text-sm ml-1">{sylName(code)}</span>
                </span>
                <span className="text-amber-600 font-semibold text-sm">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
