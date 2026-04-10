import { jsPDF } from 'jspdf';
import { pct, pctColor, testRef, formatDate, getStudentIBYear, aggregateConceptsWrong, aggregateAO, studentAvg } from './helpers';
import { getStudentResults, getTestById } from './queries';
import { sylName } from './syllabus';

// Sanitize text for jsPDF (built-in Helvetica can't handle Unicode)
function san(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2190-\u21FF]/g, '->')
    .replace(/[^\x00-\x7F]/g, '');
}

export function generateStudentPDF(student, results, tests) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const studentResults = getStudentResults(student.id, results);
  const avg = studentAvg(student.id, results, tests);
  const weakConcepts = aggregateConceptsWrong(studentResults);
  const ao = aggregateAO(studentResults);
  const aoTotal = ao.AO1 + ao.AO2 + ao.AO3;
  const pw = 190;
  let y = 15;

  const slate800 = [30, 41, 59];
  const slate500 = [100, 116, 139];
  const slate200 = [226, 232, 240];
  const green = [22, 163, 74];
  const amber = [217, 119, 6];
  const red = [220, 38, 38];
  function pctColorRGB(p) { return p >= 70 ? green : p >= 50 ? amber : red; }

  // ── HEADER ──
  doc.setFillColor(...slate800);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(san(student.name), 15, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(san(`${student.school || ''} - ${(student.class_codes || []).join(', ')} - ${getStudentIBYear(student) || ''}`), 15, 21);
  const dateStr = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Report generated ${dateStr}`, 15, 27);
  if (avg !== null) {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`${avg}%`, 195, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`avg across ${studentResults.length} test${studentResults.length !== 1 ? 's' : ''}`, 195, 24, { align: 'right' });
  }
  y = 40;

  // ── TEST HISTORY TABLE ──
  doc.setTextColor(...slate800);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Test History', 15, y);
  y += 6;

  if (studentResults.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pw, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate500);
    doc.text('TEST', 17, y + 5);
    doc.text('NAME', 42, y + 5);
    doc.text('SCORE', 140, y + 5);
    doc.text('%', 165, y + 5);
    doc.text('DATE', 178, y + 5);
    y += 9;

    const sorted = [...studentResults].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    sorted.forEach((r, i) => {
      const test = getTestById(r.test_id, tests);
      if (!test) return;
      const p = pct(r.total_marks, test.max_marks);
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 4, pw, 7, 'F');
      }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate500);
      doc.text(san(testRef(test)), 17, y);
      doc.setTextColor(...slate800);
      doc.text(san((test.display_name || '').substring(0, 50)), 42, y);
      doc.text(`${r.total_marks}/${test.max_marks}`, 140, y);
      doc.setTextColor(...pctColorRGB(p));
      doc.setFont('helvetica', 'bold');
      doc.text(`${p}%`, 165, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate500);
      doc.text(formatDate(r.created_at), 178, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 15; }
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text('No test results yet.', 17, y + 3);
    y += 8;
  }

  y += 6;
  if (y > 200) { doc.addPage(); y = 15; }

  // ── TWO COLUMNS: WEAK CONCEPTS + AO ──
  const colLeft = 15, colRight = 112, colW = 85;
  let yLeft = y, yRight = y;

  doc.setTextColor(...slate800);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Weak Concepts', colLeft, yLeft);
  yLeft += 7;

  if (weakConcepts.length > 0) {
    weakConcepts.slice(0, 10).forEach(([code, count]) => {
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(colLeft, yLeft - 3.5, colW, 7, 1, 1, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(code, colLeft + 2, yLeft);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate800);
      doc.text(san(sylName(code)), colLeft + 14, yLeft);
      doc.setTextColor(180, 83, 9);
      doc.text(`${count}x`, colLeft + colW - 2, yLeft, { align: 'right' });
      yLeft += 8;
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text('No weak concepts identified.', colLeft + 2, yLeft);
    yLeft += 8;
  }

  doc.setTextColor(...slate800);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('AO Distribution', colRight, yRight);
  yRight += 7;

  if (aoTotal > 0) {
    const aoColors = { AO1: [59, 130, 246], AO2: [168, 85, 247], AO3: [244, 63, 94] };
    const aoBg = { AO1: [239, 246, 255], AO2: [245, 243, 255], AO3: [255, 241, 242] };
    ['AO1', 'AO2', 'AO3'].forEach(k => {
      const val = ao[k];
      const pctVal = Math.round((val / aoTotal) * 100);
      doc.setFillColor(...aoBg[k]);
      doc.roundedRect(colRight, yRight - 3.5, colW, 9, 1, 1, 'F');
      const barW = Math.max(1, (pctVal / 100) * (colW - 30));
      doc.setFillColor(...aoColors[k]);
      doc.roundedRect(colRight + 24, yRight - 2, barW, 5, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...aoColors[k]);
      doc.text(k, colRight + 2, yRight + 1.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate800);
      doc.text(`${val} marks (${pctVal}%)`, colRight + colW - 2, yRight + 1.5, { align: 'right' });
      yRight += 11;
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text('No AO data available.', colRight + 2, yRight);
    yRight += 8;
  }

  y = Math.max(yLeft, yRight) + 8;
  if (y > 240) { doc.addPage(); y = 15; }

  // ── REMEDIATION PATHWAYS ──
  doc.setTextColor(...slate800);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Remediation Pathways', 15, y);
  y += 3;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate500);
  doc.text('Compiled from all test results - grouped by concept', 15, y);
  y += 6;

  const conceptHistory = {};
  studentResults.forEach(r => {
    const td = r.tracker_data;
    if (!td || !td.error_analysis) return;
    const test = getTestById(r.test_id, tests);
    td.error_analysis.forEach(ea => {
      const concept = ea.concept || '?';
      if (!conceptHistory[concept]) conceptHistory[concept] = { count: 0, totalLost: 0, entries: [], remediations: [] };
      conceptHistory[concept].count++;
      conceptHistory[concept].totalLost += ea.marks_lost || 0;
      conceptHistory[concept].entries.push({
        testRef: test ? testRef(test) : '?',
        displayName: test ? test.display_name : '?',
        misconception: ea.misconception || '',
        marksLost: ea.marks_lost || 0,
        date: formatDate(r.created_at)
      });
      if (ea.remediation && !conceptHistory[concept].remediations.includes(ea.remediation)) {
        conceptHistory[concept].remediations.push(ea.remediation);
      }
    });
  });

  const conceptGroups = Object.entries(conceptHistory).sort((a, b) => b[1].count - a[1].count);

  if (conceptGroups.length > 0) {
    conceptGroups.slice(0, 6).forEach(([concept, data]) => {
      if (y > 245) { doc.addPage(); y = 15; }
      const patternTag = data.count >= 3 ? 'PERSISTENT GAP' : data.count === 2 ? 'RECURRING' : 'ONE-OFF';
      const patternColor = data.count >= 3 ? [220, 38, 38] : data.count === 2 ? [217, 119, 6] : [100, 116, 139];

      doc.setFillColor(255, 251, 235);
      doc.roundedRect(15, y - 3, pw, 7, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(concept, 17, y + 0.5);
      doc.setTextColor(...slate800);
      doc.text(san(sylName(concept)), 30, y + 0.5);
      doc.setTextColor(...patternColor);
      doc.setFontSize(6.5);
      doc.text(san(`${patternTag} - ${data.count}x - ${data.totalLost} marks lost`), pw + 15 - 2, y + 0.5, { align: 'right' });
      y += 7;

      data.entries.forEach(entry => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate500);
        doc.text(san(`${entry.testRef}  ${entry.displayName}  (${entry.date})  -${entry.marksLost}m`), 19, y);
        y += 3;
        if (entry.misconception) {
          doc.setTextColor(...slate800);
          const miscLines = doc.splitTextToSize(san(entry.misconception), pw - 12);
          doc.text(miscLines, 19, y);
          y += miscLines.length * 3 + 1;
        }
      });

      if (data.remediations.length > 0) {
        if (y > 265) { doc.addPage(); y = 15; }
        y += 1;
        const bestRem = data.remediations[data.remediations.length - 1];
        doc.setFillColor(239, 246, 255);
        const remLines = doc.splitTextToSize(san(bestRem), pw - 10);
        const boxH = remLines.length * 3.5 + 4;
        doc.roundedRect(15, y - 2, pw, boxH, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 64, 175);
        doc.text(remLines, 17, y + 1.5);
        y += boxH + 3;
      }
      y += 3;
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text('No remediation data available. More test results needed.', 17, y);
  }

  // ── FOOTER ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...slate200);
    doc.text(san(`IB Score Tracker - ${student.name} - Page ${i}/${pageCount}`), 105, 290, { align: 'center' });
  }

  const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '-');
  doc.save(`${safeName}_Report_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`);
}
