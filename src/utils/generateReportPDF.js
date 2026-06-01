import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Color palette
 */
const COLORS = {
  primary: [22, 101, 52],       // #166534 deep green
  primaryLight: [220, 252, 231], // #dcfce7
  accent: [59, 130, 246],        // #3b82f6 blue
  dark: [23, 23, 23],            // #171717
  muted: [115, 115, 115],        // #737373
  border: [212, 212, 212],       // #d4d4d4
  white: [255, 255, 255],
  green: [22, 163, 74],
  red: [220, 38, 38],
  yellow: [202, 138, 4],
  blue: [37, 99, 235],
  sectionBg: [249, 250, 251],    // #f9fafb
};

const PAGE_MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

/**
 * Generate a comprehensive, professional PDF report from AI report data.
 *
 * @param {Object} reportData - Report data assembled in StateDashboard
 *   (state_overview, service_delivery.metrics, charts, swot, recommendations,
 *   ai_narrative). The narrative comes from HIVA via POST /ai/query.
 * @param {string} month - The report month (YYYY-MM)
 */
export default function generateReportPDF(reportData, month) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 0; // current y position

  const {
    state_overview = {},
    service_delivery = {},
    key_issues = [],
    recommendations = [],
    charts = {},
    swot = {},
    ai_narrative,
    ai_analysis,
    executive_summary,
  } = reportData;

  // Service delivery is now a flat metrics array: { category, total_reports,
  // avg_value, min_value, max_value }. `category` = user-defined form field key.
  const sdMetrics = service_delivery.metrics || charts.service_metrics || [];
  const monthLabel = formatMonthLabel(month);

  // Helper: check page break
  const ensureSpace = (needed) => {
    if (y + needed > 280) {
      doc.addPage();
      y = PAGE_MARGIN;
      addFooter(doc);
    }
  };

  // ================================================================
  // COVER PAGE
  // ================================================================
  // Background accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 60, 'F');

  // Title block
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('KADUNA STATE GOVERNMENT', PAGE_MARGIN, 20);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Ward Development Committee', PAGE_MARGIN, 32);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Generated Comprehensive Monthly Report', PAGE_MARGIN, 42);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(monthLabel, PAGE_MARGIN, 54);

  // Separator line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, 66, PAGE_WIDTH - PAGE_MARGIN, 66);

  // Quick stats boxes
  y = 76;
  const boxW = (CONTENT_WIDTH - 12) / 4;
  const quickStats = [
    { label: 'Total LGAs', value: state_overview.total_lgas ?? '-' },
    { label: 'Total Wards', value: state_overview.total_wards ?? '-' },
    { label: 'Submitted', value: state_overview.reports_submitted ?? '-' },
    { label: 'Submission Rate', value: `${state_overview.submission_rate ?? 0}%` },
  ];

  quickStats.forEach((stat, i) => {
    const x = PAGE_MARGIN + i * (boxW + 4);
    doc.setFillColor(...COLORS.sectionBg);
    doc.roundedRect(x, y, boxW, 22, 2, 2, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(String(stat.value), x + boxW / 2, y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(stat.label.toUpperCase(), x + boxW / 2, y + 17, { align: 'center' });
  });

  y = 106;

  // Rate change indicator
  const rateChange = state_overview.rate_change ?? 0;
  const prevRate = state_overview.prev_rate ?? 0;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(`Previous Month: ${prevRate}%  |  Change: ${rateChange > 0 ? '+' : ''}${rateChange}%`, PAGE_MARGIN, y);
  y += 6;

  // Missing reports
  doc.setTextColor(...(state_overview.reports_missing > 0 ? COLORS.red : COLORS.green));
  doc.text(`Reports Missing: ${state_overview.reports_missing ?? 0}`, PAGE_MARGIN, y);
  y += 4;

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, PAGE_MARGIN, y + 6);
  doc.text('Kaduna State WDC Digital Reporting System  |  AI-Powered Analytics', PAGE_MARGIN, y + 11);

  addFooter(doc);

  // ================================================================
  // PAGE 2+: EXECUTIVE SUMMARY / AI NARRATIVE
  // ================================================================
  doc.addPage();
  y = PAGE_MARGIN;
  addFooter(doc);

  const narrativeText = ai_narrative || ai_analysis || executive_summary || null;
  if (narrativeText) {
    y = addSectionHeading(doc, 'Executive Summary & AI Analysis', y);
    y = addWrappedText(doc, narrativeText, y, 9, COLORS.dark);
    y += 8;
  }

  // ================================================================
  // SERVICE DELIVERY METRICS (data-driven from form field keys)
  // ================================================================
  ensureSpace(40);
  y = addSectionHeading(doc, 'Service Delivery Metrics', y);

  if (sdMetrics.length > 0) {
    const round1 = (v) => (v == null ? '-' : String(Math.round(Number(v) * 10) / 10));
    const sdRows = sdMetrics.map((m) => [
      humanizeKey(m.category),
      fmtNum(m.total_reports),
      round1(m.avg_value),
      m.min_value == null ? '-' : fmtNum(m.min_value),
      m.max_value == null ? '-' : fmtNum(m.max_value),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Reports', 'Average', 'Min', 'Max']],
      body: sdRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y + 40) + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('No service-delivery metrics for this period.', PAGE_MARGIN, y);
    y += 8;
  }

  // ================================================================
  // LGA PERFORMANCE TABLE
  // ================================================================
  ensureSpace(40);
  y = addSectionHeading(doc, 'LGA Performance Rankings', y);

  const lgaRates = (charts.lga_rates || []).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  if (lgaRates.length > 0) {
    const lgaRows = lgaRates.map((lga, i) => [
      String(i + 1),
      lga.name,
      String(lga.submitted ?? 0),
      String(lga.total ?? 0),
      String(lga.missing ?? ((lga.total ?? 0) - (lga.submitted ?? 0))),
      `${lga.rate ?? 0}%`,
      getRatingLabel(lga.rate ?? 0),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'LGA Name', 'Submitted', 'Total Wards', 'Missing', 'Rate', 'Rating']],
      body: lgaRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const rating = data.cell.raw;
          if (rating === 'Excellent') data.cell.styles.textColor = COLORS.green;
          else if (rating === 'Good') data.cell.styles.textColor = COLORS.blue;
          else if (rating === 'Fair') data.cell.styles.textColor = COLORS.yellow;
          else data.cell.styles.textColor = COLORS.red;
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y + 40) + 10;
  }

  // ================================================================
  // KEY ISSUES & CHALLENGES
  // ================================================================
  ensureSpace(30);
  y = addSectionHeading(doc, 'Key Issues & Challenges', y);

  if (key_issues.length > 0) {
    const issueRows = key_issues.map((issue, i) => [
      String(i + 1),
      capitalize(issue.word || issue.issue || ''),
      String(issue.count || issue.frequency || ''),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Issue / Challenge', 'Mentions']],
      body: issueRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'grid',
      headStyles: { fillColor: COLORS.yellow, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center' } },
    });
    y = (doc.lastAutoTable?.finalY ?? y + 20) + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('No specific issues reported for this period.', PAGE_MARGIN, y);
    y += 8;
  }

  // ================================================================
  // RECOMMENDATIONS
  // ================================================================
  ensureSpace(30);
  y = addSectionHeading(doc, 'Recommendations', y);

  if (recommendations.length > 0) {
    recommendations.forEach((rec, i) => {
      ensureSpace(14);
      doc.setFillColor(...COLORS.primaryLight);
      doc.roundedRect(PAGE_MARGIN, y - 1, CONTENT_WIDTH, 10, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`${i + 1}.`, PAGE_MARGIN + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      const lines = doc.splitTextToSize(rec, CONTENT_WIDTH - 14);
      doc.text(lines[0], PAGE_MARGIN + 10, y + 5);
      if (lines.length > 1) {
        y += 10;
        for (let l = 1; l < lines.length; l++) {
          ensureSpace(6);
          doc.text(lines[l], PAGE_MARGIN + 10, y + 3);
          y += 5;
        }
      } else {
        y += 12;
      }
    });
    y += 4;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('No recommendations available for this period.', PAGE_MARGIN, y);
    y += 8;
  }

  // ================================================================
  // SWOT ANALYSIS
  // ================================================================
  ensureSpace(50);
  y = addSectionHeading(doc, 'SWOT Analysis', y);

  const swotSections = [
    { title: 'Strengths', items: swot.strengths || [], color: COLORS.green, bg: [220, 252, 231] },
    { title: 'Weaknesses', items: swot.weaknesses || [], color: COLORS.red, bg: [254, 226, 226] },
    { title: 'Opportunities', items: swot.opportunities || [], color: COLORS.blue, bg: [219, 234, 254] },
    { title: 'Threats', items: swot.threats || [], color: COLORS.yellow, bg: [254, 249, 195] },
  ];

  swotSections.forEach((section) => {
    ensureSpace(20);
    // Header bar
    doc.setFillColor(...section.color);
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 7, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(section.title.toUpperCase(), PAGE_MARGIN + 4, y + 5);
    y += 9;

    if (section.items.length > 0) {
      section.items.forEach((item) => {
        ensureSpace(8);
        doc.setFillColor(...section.bg);
        doc.rect(PAGE_MARGIN, y - 1, CONTENT_WIDTH, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.dark);
        const lines = doc.splitTextToSize(`- ${item}`, CONTENT_WIDTH - 6);
        doc.text(lines[0], PAGE_MARGIN + 3, y + 4);
        y += 7;
        for (let l = 1; l < lines.length; l++) {
          ensureSpace(6);
          doc.text(lines[l], PAGE_MARGIN + 6, y + 3);
          y += 5;
        }
      });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text('  No items identified.', PAGE_MARGIN + 3, y + 4);
      y += 7;
    }
    y += 4;
  });

  // ================================================================
  // FOOTER ON ALL PAGES
  // ================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Page number
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, 290, { align: 'center' });
    // Bottom line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, 286, PAGE_WIDTH - PAGE_MARGIN, 286);
    doc.setFontSize(6);
    doc.text('Kaduna State WDC Digital Reporting System  |  Confidential', PAGE_MARGIN, 294);
    doc.text(monthLabel, PAGE_WIDTH - PAGE_MARGIN, 294, { align: 'right' });
  }

  // Save
  doc.save(`Kaduna_WDC_AI_Report_${month}.pdf`);
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function addFooter(doc) {
  // placeholder — final footer is applied at end with page numbers
}

function addSectionHeading(doc, title, y) {
  if (y + 14 > 280) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 9, 1.5, 1.5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(title.toUpperCase(), PAGE_MARGIN + 4, y + 6.5);
  return y + 14;
}

function addSubHeading(doc, title, y) {
  if (y + 10 > 280) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, PAGE_MARGIN, y + 4);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y + 6, PAGE_MARGIN + doc.getTextWidth(title), y + 6);
  return y + 10;
}

function addWrappedText(doc, text, startY, fontSize, color) {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  let y = startY;
  const lineHeight = fontSize * 0.45;
  lines.forEach((line) => {
    if (y + lineHeight > 280) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.text(line, PAGE_MARGIN, y);
    y += lineHeight;
  });
  return y;
}

function fmtNum(val) {
  if (val == null) return '0';
  return Number(val).toLocaleString();
}

function getRatingLabel(rate) {
  if (rate >= 90) return 'Excellent';
  if (rate >= 70) return 'Good';
  if (rate >= 50) return 'Fair';
  return 'Poor';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function humanizeKey(key = '') {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatMonthLabel(month) {
  if (!month) return '';
  try {
    const [y, m] = month.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return month;
  }
}
