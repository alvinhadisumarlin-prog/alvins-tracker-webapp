'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '@/hooks/useData';
import SubjectPill from '@/components/ui/SubjectPill';
import StudentPanel from '@/components/students/StudentPanel';
import { pct, pctColor, testRef, formatDate, subjectLabel } from '@/lib/helpers';
import { getStudentResults, getStudentById, getTestById } from '@/lib/queries';
import { generateStudentPDF } from '@/lib/pdf';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function TrendsPage() {
  const { students, tests, results } = useData();
  const [trendStudentId, setTrendStudentId] = useState(null);
  const [trendSubject, setTrendSubject] = useState('all');
  const [panelStudent, setPanelStudent] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const subjects = useMemo(() => [...new Set(tests.map(t => t.subject))].sort(), [tests]);

  const studentsWithResults = useMemo(() =>
    students
      .filter(s => getStudentResults(s.id, results).length > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [students, results]
  );

  // Auto-select first student
  const activeStudentId = useMemo(() => {
    if (trendStudentId && studentsWithResults.some(s => s.id === trendStudentId)) return trendStudentId;
    return studentsWithResults[0]?.id || null;
  }, [trendStudentId, studentsWithResults]);

  const selectedStudent = activeStudentId ? getStudentById(activeStudentId, students) : null;

  const sortedResults = useMemo(() => {
    if (!selectedStudent) return [];
    let studentRes = getStudentResults(selectedStudent.id, results);
    if (trendSubject !== 'all') {
      studentRes = studentRes.filter(r => {
        const test = getTestById(r.test_id, tests);
        return test && test.subject === trendSubject;
      });
    }
    return [...studentRes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [selectedStudent, results, tests, trendSubject]);

  // Trend calculation
  const { trendDirection, trendValue, overallAvgVal, highScore, lowScore } = useMemo(() => {
    if (sortedResults.length < 2) return { trendDirection: null, trendValue: null, overallAvgVal: null, highScore: null, lowScore: null };
    const scores = sortedResults.map(r => {
      const test = getTestById(r.test_id, tests);
      return pct(r.total_marks, test?.max_marks);
    });
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const tv = Math.round(secondAvg - firstAvg);
    const td = tv > 2 ? 'up' : tv < -2 ? 'down' : 'stable';
    return { trendDirection: td, trendValue: tv, overallAvgVal: avg, highScore: high, lowScore: low };
  }, [sortedResults, tests]);

  // Chart rendering
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (sortedResults.length < 2) return;

    const dataPoints = sortedResults.map(r => {
      const test = getTestById(r.test_id, tests);
      const p = pct(r.total_marks, test?.max_marks);
      return {
        label: test ? test.display_name : '?',
        ref: test ? testRef(test) : '?',
        value: p,
        date: formatDate(r.created_at),
        subject: test?.subject
      };
    });

    // Linear regression for trend line
    const n = dataPoints.length;
    const xMean = (n - 1) / 2;
    const yMean = dataPoints.reduce((sum, d) => sum + d.value, 0) / n;
    let numerator = 0, denominator = 0;
    dataPoints.forEach((d, i) => {
      numerator += (i - xMean) * (d.value - yMean);
      denominator += (i - xMean) * (i - xMean);
    });
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    const trendData = dataPoints.map((_, i) => Math.round(intercept + slope * i));

    const pointColors = dataPoints.map(d =>
      d.value >= 70 ? '#16a34a' : d.value >= 50 ? '#d97706' : '#dc2626'
    );

    chartInstance.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dataPoints.map(d => d.date),
        datasets: [
          {
            label: 'Score %',
            data: dataPoints.map(d => d.value),
            borderColor: '#1e293b',
            backgroundColor: 'rgba(30,41,59,0.08)',
            fill: false, tension: 0.2,
            pointBackgroundColor: pointColors,
            pointRadius: 7, pointHoverRadius: 9,
            borderWidth: 2,
            _meta: dataPoints
          },
          {
            label: 'Trend',
            data: trendData,
            borderColor: slope > 0.5 ? '#16a34a' : slope < -0.5 ? '#dc2626' : '#94a3b8',
            backgroundColor: 'transparent',
            borderDash: [5, 5], borderWidth: 2,
            pointRadius: 0, fill: false, tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              title: function(ctx) {
                const idx = ctx[0].dataIndex;
                const meta = ctx[0].dataset._meta;
                if (meta && meta[idx]) return `${meta[idx].ref} - ${meta[idx].label}`;
                return ctx[0].label;
              },
              label: function(ctx) {
                return ctx.datasetIndex === 0 ? `Score: ${ctx.raw}%` : `Trend: ${ctx.raw}%`;
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
          x: { ticks: { maxRotation: 45, minRotation: 0 } }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [sortedResults, tests]);

  function handleExportPDF() {
    if (!selectedStudent) return;
    generateStudentPDF(selectedStudent, results, tests);
  }

  const summaryItems = sortedResults.length >= 2 ? [
    { label: 'Tests Completed', value: sortedResults.length, cls: 'text-slate-800' },
    { label: 'Overall Average', value: overallAvgVal + '%', cls: pctColor(overallAvgVal) },
    { label: 'Best Score', value: highScore + '%', cls: 'stat-green' },
    { label: 'Lowest Score', value: lowScore + '%', cls: 'stat-red' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Student</label>
            <select
              value={activeStudentId || ''}
              onChange={e => { setTrendStudentId(e.target.value); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {studentsWithResults.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({getStudentResults(s.id, results).length} tests)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Subject</label>
            <select
              value={trendSubject}
              onChange={e => setTrendSubject(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{subjectLabel(s)}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExportPDF}
              disabled={!selectedStudent}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition border-none cursor-pointer"
              style={{
                fontFamily: 'inherit',
                ...(selectedStudent
                  ? { background: '#1e293b', color: 'white' }
                  : { background: '#cbd5e1', color: '#94a3b8', cursor: 'not-allowed' })
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {selectedStudent ? (
        <>
          {/* Chart + Summary */}
          {sortedResults.length >= 2 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Performance Over Time</h3>
                <canvas ref={chartRef} height={200} />
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Summary</h3>
                <div className="space-y-3">
                  {summaryItems.map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className={`font-semibold ${item.cls}`}>{item.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Trend Direction</span>
                    <span className={`font-semibold ${trendDirection === 'up' ? 'stat-green' : trendDirection === 'down' ? 'stat-red' : 'text-slate-500'}`}>
                      {trendDirection === 'up' ? '↑ Improving' : trendDirection === 'down' ? '↓ Declining' : '→ Stable'}
                      {trendValue !== null ? ` (${trendValue > 0 ? '+' : ''}${trendValue}%)` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-slate-400 text-lg mb-2">📊</div>
              <div className="text-slate-600">Need at least 2 test results to show a trend chart.</div>
              <div className="text-slate-400 text-sm mt-1">{sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} recorded</div>
            </div>
          )}

          {/* Results Table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Test</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">%</th>
                  <th className="px-4 py-3 text-left">Weak Areas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedResults.map((r, idx) => {
                  const test = getTestById(r.test_id, tests);
                  if (!test) return null;
                  const p = pct(r.total_marks, test.max_marks);
                  const td = r.tracker_data || {};
                  const wrongConcepts = (td.concepts_wrong || []).slice(0, 3);

                  let change = null;
                  if (idx > 0) {
                    const prevR = sortedResults[idx - 1];
                    const prevTest = getTestById(prevR.test_id, tests);
                    if (prevTest) {
                      change = p - pct(prevR.total_marks, prevTest.max_marks);
                    }
                  }

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => setPanelStudent({ studentId: selectedStudent.id, resultId: r.id })}
                    >
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-slate-800">{test.display_name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="mono text-xs text-slate-400">{testRef(test)}</span>
                          <SubjectPill subject={test.subject} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`mono font-medium text-sm ${pctColor(p)}`}>{r.total_marks}/{test.max_marks}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-semibold text-sm ${pctColor(p)}`}>{p}%</span>
                          {change !== null && (
                            <span className={`text-xs ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {change > 0 ? '↑' + change : change < 0 ? '↓' + Math.abs(change) : '→'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {wrongConcepts.length > 0
                          ? wrongConcepts.map(c => (
                              <span key={c} className="mono text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded mr-1">{c}</span>
                            ))
                          : <span className="text-xs text-green-600">✓ All correct</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedResults.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No results match your filters.</div>
            )}
          </div>
        </>
      ) : (
        <div className="card p-8 text-center">
          <div className="text-slate-400 text-lg mb-2">👤</div>
          <div className="text-slate-600">Select a student to view their performance trend.</div>
        </div>
      )}

      {/* Student detail panel */}
      {panelStudent && (
        <StudentPanel
          studentId={panelStudent.studentId}
          initialResultId={panelStudent.resultId}
          onClose={() => setPanelStudent(null)}
        />
      )}
    </div>
  );
}
