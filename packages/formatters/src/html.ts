import type { Report, Finding, CognitiveScore, Severity } from '@cognitivelint/core';
import type { Formatter, FormatterOptions } from './types.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSeverityClass(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'severity-critical';
    case 'high':
      return 'severity-high';
    case 'medium':
      return 'severity-medium';
    case 'low':
      return 'severity-low';
    case 'info':
      return 'severity-info';
    default:
      return '';
  }
}

function getGradeClass(grade: string): string {
  switch (grade) {
    case 'A':
      return 'grade-a';
    case 'B':
      return 'grade-b';
    case 'C':
      return 'grade-c';
    case 'D':
      return 'grade-d';
    case 'F':
      return 'grade-f';
    default:
      return '';
  }
}

function renderScoreCard(score: CognitiveScore): string {
  return `
    <div class="score-card">
      <div class="overall-score ${getGradeClass(score.grade)}">
        <span class="score-value">${score.overall}</span>
        <span class="score-grade">${score.grade}</span>
      </div>
      <div class="score-label">Cognitive Score</div>
    </div>
  `;
}

function renderCategoryScores(score: CognitiveScore): string {
  const categories = score.categories
    .map(
      (cat) => `
    <div class="category-row">
      <span class="category-name">${escapeHtml(cat.category)}</span>
      <div class="category-bar">
        <div class="category-fill" style="width: ${cat.score}%"></div>
      </div>
      <span class="category-score">${cat.score}</span>
      <span class="category-findings">${cat.findingCount} findings</span>
    </div>
  `
    )
    .join('');

  return `
    <div class="category-scores">
      <h3>Category Breakdown</h3>
      ${categories}
    </div>
  `;
}

function renderFinding(finding: Finding): string {
  const location = `${finding.location.file}:${finding.location.startLine}:${finding.location.startColumn}`;
  const context = finding.context
    ? Object.entries(finding.context)
        .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`)
        .join('')
    : '';

  return `
    <div class="finding ${getSeverityClass(finding.severity)}">
      <div class="finding-header">
        <span class="finding-severity">${finding.severity}</span>
        <span class="finding-rule">${escapeHtml(finding.ruleId)}</span>
        <span class="finding-confidence">${finding.confidence}% confidence</span>
      </div>
      <div class="finding-message">${escapeHtml(finding.message)}</div>
      <div class="finding-location">${escapeHtml(location)}</div>
      ${context ? `<div class="finding-context">${context}</div>` : ''}
    </div>
  `;
}

function renderFindings(findings: Finding[]): string {
  if (findings.length === 0) {
    return '<div class="no-findings">No cognitive UX issues found!</div>';
  }

  const grouped: Record<string, Finding[]> = {};
  for (const finding of findings) {
    const file = finding.location.file;
    if (!grouped[file]) {
      grouped[file] = [];
    }
    grouped[file].push(finding);
  }

  const sections = Object.entries(grouped)
    .map(
      ([file, fileFindings]) => `
    <div class="file-section">
      <h4 class="file-name">${escapeHtml(file)}</h4>
      ${fileFindings.map(renderFinding).join('')}
    </div>
  `
    )
    .join('');

  return `
    <div class="findings">
      <h3>Findings (${findings.length})</h3>
      ${sections}
    </div>
  `;
}

function renderSummary(report: Report): string {
  const s = report.summary;
  return `
    <div class="summary">
      <h3>Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-value">${s.filesAnalyzed}</span>
          <span class="summary-label">Files Analyzed</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${s.componentsAnalyzed}</span>
          <span class="summary-label">Components</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${s.totalFindings}</span>
          <span class="summary-label">Findings</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${s.scanDurationMs}ms</span>
          <span class="summary-label">Scan Time</span>
        </div>
      </div>
    </div>
  `;
}

const CSS = `
  :root {
    --bg: #ffffff;
    --bg-alt: #f8fafc;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --primary: #3b82f6;
    --success: #22c55e;
    --warning: #eab308;
    --danger: #ef4444;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a;
      --bg-alt: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: #334155;
    }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .timestamp {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .score-card {
    background: var(--bg-alt);
    border-radius: 1rem;
    padding: 2rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  .overall-score {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .score-value {
    font-size: 4rem;
    font-weight: 700;
  }

  .score-grade {
    font-size: 2rem;
    font-weight: 600;
  }

  .score-label {
    color: var(--text-muted);
    margin-top: 0.5rem;
  }

  .grade-a { color: var(--success); }
  .grade-b { color: #86efac; }
  .grade-c { color: var(--warning); }
  .grade-d { color: #fb923c; }
  .grade-f { color: var(--danger); }

  h3 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .category-scores {
    background: var(--bg-alt);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .category-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .category-row:last-child {
    border-bottom: none;
  }

  .category-name {
    width: 140px;
    font-size: 0.875rem;
  }

  .category-bar {
    flex: 1;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .category-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 4px;
  }

  .category-score {
    width: 40px;
    text-align: right;
    font-weight: 600;
  }

  .category-findings {
    width: 100px;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .findings {
    margin-bottom: 2rem;
  }

  .file-section {
    margin-bottom: 1.5rem;
  }

  .file-name {
    font-size: 0.875rem;
    font-family: monospace;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.5rem;
  }

  .finding {
    background: var(--bg-alt);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid var(--border);
  }

  .severity-critical { border-left-color: var(--danger); }
  .severity-high { border-left-color: #f87171; }
  .severity-medium { border-left-color: var(--warning); }
  .severity-low { border-left-color: var(--primary); }
  .severity-info { border-left-color: var(--text-muted); }

  .finding-header {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
  }

  .finding-severity {
    text-transform: uppercase;
    font-weight: 600;
  }

  .finding-rule {
    font-family: monospace;
    color: var(--text-muted);
  }

  .finding-confidence {
    color: var(--text-muted);
    margin-left: auto;
  }

  .finding-message {
    margin-bottom: 0.5rem;
  }

  .finding-location {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .finding-context {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.875rem;
  }

  .finding-context p {
    margin-bottom: 0.25rem;
  }

  .no-findings {
    text-align: center;
    padding: 3rem;
    color: var(--success);
    font-size: 1.25rem;
  }

  .summary {
    background: var(--bg-alt);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .summary-item {
    text-align: center;
  }

  .summary-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .summary-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  footer a {
    color: var(--primary);
    text-decoration: none;
  }
`;

export const htmlFormatter: Formatter = {
  name: 'html',
  mimeType: 'text/html',
  fileExtension: 'html',

  format(report: Report, _options?: FormatterOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CognitiveLint Report - ${escapeHtml(report.project.name)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>CognitiveLint Report</h1>
      <p class="timestamp">${escapeHtml(report.project.name)} - ${escapeHtml(report.timestamp)}</p>
    </header>

    <main>
      ${renderScoreCard(report.score)}
      ${renderCategoryScores(report.score)}
      ${renderFindings(report.findings)}
      ${renderSummary(report)}
    </main>

    <footer>
      Generated by <a href="https://cognitivelint.dev">CognitiveLint</a> v${escapeHtml(report.tool.version)}
    </footer>
  </div>
</body>
</html>`;
  },
};
