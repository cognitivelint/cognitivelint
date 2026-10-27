import type { StoredRun } from '../store/types.js';
import type { PublicProject } from '../store/types.js';
import { brandLogoHtml } from './brand.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formControl(inner: string): string {
  return `<span class="pf-v5-c-form-control">${inner}</span>`;
}

/** Readable project UUID in tables (full value stays in title / copy). */
function formatProjectIdDisplay(id: string): string {
  if (id.length <= 24) return id;
  return `${id.slice(0, 8)}…${id.slice(-8)}`;
}

function copyIconSvg(): string {
  return `<svg class="cl-copy-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
}

/** Sample report path in the monorepo (see packages/ci-server/examples/). */
export const EXAMPLE_REPORT_FILE = 'packages/ci-server/examples/report.json';

export function uploadCliCommand(options: {
  server?: string;
  token: string;
  projectId: string;
  file?: string;
}): string {
  const server = options.server ?? 'http://127.0.0.1:3848';
  const file = options.file ?? EXAMPLE_REPORT_FILE;
  return `cognitivelint upload --server ${server} \\
  --token "${options.token}" \\
  --project-id "${options.projectId}" \\
  --file ${file}`;
}

const CATEGORY_META: Array<{ id: string; label: string; color: string }> = [
  { id: 'cognitive-load', label: 'Cognitive load', color: '#0066cc' },
  { id: 'trust-confidence', label: 'Trust & confidence', color: '#2b9af3' },
  { id: 'feedback', label: 'Feedback', color: '#3e8635' },
  { id: 'discoverability', label: 'Discoverability', color: '#f0ab00' },
  { id: 'consistency', label: 'Consistency', color: '#8476d1' },
  { id: 'error-prevention', label: 'Error prevention', color: '#c9190b' },
];

function gradeModifier(grade: string): string {
  switch (grade) {
    case 'A':
      return 'pf-m-green';
    case 'B':
      return 'pf-m-blue';
    case 'C':
      return 'pf-m-gold';
    case 'D':
      return 'pf-m-orange';
    default:
      return 'pf-m-red';
  }
}

interface SparkOptions {
  compact?: boolean;
  showXLabels?: boolean;
}

function sparkline(
  values: number[],
  labels: string[],
  color: string,
  chartId: string,
  options: SparkOptions = {},
): string {
  const compact = options.compact === true;
  const width = 640;
  const height = compact ? 150 : 220;
  const padX = 36;
  const padY = compact ? 16 : 24;
  const bottom = options.showXLabels ? 28 : 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - bottom;
  const gridStroke = '#d2d2d2';
  const gridText = '#6a6e73';

  const grid = [0, 25, 50, 75, 100]
    .map((n) => {
      const y = padY + innerH - (n / 100) * innerH;
      return `<line x1="${padX}" x2="${width - padX}" y1="${y}" y2="${y}" stroke="${gridStroke}" />
        <text x="6" y="${y + 4}" fill="${gridText}" font-size="11">${n}</text>`;
    })
    .join('');

  if (values.length === 0) {
    return `<svg class="cl-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="No data">
      ${grid}
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${gridText}" font-size="14">Waiting for the first upload</text>
    </svg>`;
  }

  const xy = values.map((v, i) => {
    const x = padX + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = padY + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;
    return { x, y, v, label: labels[i] ?? String(i) };
  });
  const line = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area =
    values.length >= 2
      ? `${padX},${padY + innerH} ${line} ${width - padX},${padY + innerH}`
      : '';
  const xLabels = options.showXLabels
    ? xy
        .map(
          (p, i) =>
            `<text x="${p.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="${gridText}" font-size="10">${escapeHtml((labels[i] ?? '').split('·')[0]?.trim() ?? '')}</text>`,
        )
        .join('')
    : '';
  const dots = xy
    .map(
      (p, i) =>
        `<g class="cl-chart__point" data-i="${i}" data-chart="${escapeHtml(chartId)}" role="button" tabindex="0" aria-label="${escapeHtml(p.label)} score ${p.v}">
           <circle class="cl-chart__hit" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="16" fill="transparent" />
           <circle class="cl-chart__dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${color}" stroke="#fff" stroke-width="2" />
         </g>`,
    )
    .join('');

  const areaSvg =
    area.length > 0
      ? `<polygon class="cl-chart__area" points="${area}" fill="${color}" />`
      : '';
  const lineSvg =
    values.length >= 2
      ? `<polyline class="cl-chart__line" fill="none" stroke="${color}" stroke-width="2.5" points="${line}" />`
      : '';
  const singleHint =
    values.length === 1
      ? `<text x="${width / 2}" y="${padY + innerH + 14}" text-anchor="middle" fill="${gridText}" font-size="11">Add more uploads to see a trend</text>`
      : '';

  return `<svg class="cl-chart" viewBox="0 0 ${width} ${height}" role="img">
    ${grid}
    ${areaSvg}
    ${lineSvg}
    ${dots}
    ${xLabels}
    ${singleHint}
  </svg>`;
}

export interface TrendsFilters {
  branch: string;
  grade: string;
  sha: string;
  from: string;
  to: string;
  /** Full or partial git SHA for the inspected run (`?run=`). */
  run: string;
}

export function emptyTrendsFilters(): TrendsFilters {
  return { branch: '', grade: '', sha: '', from: '', to: '', run: '' };
}

export function resolveSelectedRunIndex(runs: StoredRun[], runQuery: string): number {
  if (runs.length === 0) return -1;
  const q = runQuery.trim().toLowerCase();
  if (q) {
    const i = runs.findIndex(
      (r) => r.sha.toLowerCase() === q || r.sha.toLowerCase().startsWith(q),
    );
    if (i >= 0) return i;
  }
  return runs.length - 1;
}

export function filterProjects(projects: PublicProject[], q: string): PublicProject[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return projects;
  return projects.filter(
    (p) => p.name.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle),
  );
}

export function filterRuns(runs: StoredRun[], filters: TrendsFilters): StoredRun[] {
  const branch = filters.branch.trim().toLowerCase();
  const grade = filters.grade.trim().toUpperCase();
  const sha = filters.sha.trim().toLowerCase();
  const from = filters.from.trim();
  const to = filters.to.trim();
  return runs.filter((r) => {
    if (branch && r.branch.toLowerCase() !== branch) return false;
    if (grade && r.grade.toUpperCase() !== grade) return false;
    if (sha && !r.sha.toLowerCase().includes(sha)) return false;
    const day = r.createdAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

function hasConfigDrift(runs: StoredRun[]): boolean {
  for (let i = 1; i < runs.length; i++) {
    if (runs[i]!.configHash !== runs[i - 1]!.configHash) {
      return true;
    }
  }
  return false;
}

function breadcrumbNav(currentLabel: string, currentHref?: string): string {
  const current = currentHref
    ? `<a class="cl-breadcrumb__current" href="${escapeHtml(currentHref)}">${escapeHtml(currentLabel)}</a>`
    : `<span class="cl-breadcrumb__current" aria-current="page">${escapeHtml(currentLabel)}</span>`;
  return `<nav class="cl-breadcrumb" aria-label="Breadcrumb">
      <a class="cl-breadcrumb__link" href="/">Projects</a>
      <span class="cl-breadcrumb__sep" aria-hidden="true">/</span>
      ${current}
    </nav>`;
}

function trendsPageHero(projectName: string, scorePanel: string, hint: string): string {
  return `<div class="cl-page-hero cl-card">
      ${breadcrumbNav(projectName)}
      <hr class="cl-page-hero__rule" />
      <div class="cl-page-hero__body">
        <div class="cl-page-hero__copy">
          <p class="cl-eyebrow">Trends dashboard</p>
          <h1 class="pf-v5-c-title pf-m-2xl cl-page-hero__title">${escapeHtml(projectName)}</h1>
          <p class="cl-hint">${escapeHtml(hint)}</p>
        </div>
        ${scorePanel}
      </div>
    </div>`;
}

function extraCss(): string {
  return `
    html, body { margin: 0; background: #f4f5f7; color: #151515; }
    .cl-app { min-height: 100vh; display: flex; flex-direction: column; background: #f4f5f7; }
    .cl-masthead {
      display: flex; align-items: center;
      width: 100%; padding: 0 1.5rem; min-height: 3.75rem;
      background: #151515; box-sizing: border-box;
      border-bottom: 1px solid #2f2f2f;
    }
    .cl-brand {
      display: inline-flex; align-items: center; gap: 0.65rem;
      color: #fff; font-weight: 600; text-decoration: none; letter-spacing: 0.01em; font-size: 1rem;
    }
    .cl-brand:hover { color: #f0f0f0; }
    .cl-brand__mark {
      display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem; line-height: 0;
    }
    .cl-brand__svg { display: block; width: 100%; height: 100%; }
    .cl-main { flex: 1 1 auto; }
    .cl-content { max-width: 1280px; margin: 0 auto; width: 100%; padding: 1.5rem 1.5rem 3rem; box-sizing: border-box; }
    .cl-eyebrow {
      margin: 0 0 0.35rem; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #6a6e73;
    }
    .cl-page-header { margin-bottom: 1.5rem; }
    .cl-page-header__title { margin: 0; line-height: 1.25; }
    .cl-page-header__lede { color: #6a6e73; max-width: 42rem; margin: 0.5rem 0 0; line-height: 1.5; font-size: 0.9375rem; }
    .cl-card {
      background: #fff;
      border: 1px solid #d2d2d2;
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(3, 3, 3, 0.06);
    }
    .cl-card .pf-v5-c-card__title,
    .cl-card .pf-v5-c-card__header { border-bottom: 1px solid #f0f0f0; }
    .cl-card--metric { transition: box-shadow 0.15s ease; }
    .cl-card--metric:hover { box-shadow: 0 2px 8px rgba(3, 3, 3, 0.08); }
    .cl-card--admin .cl-admin-block { padding: 0.25rem 0 1rem; }
    .cl-card--admin .cl-admin-block:last-child { padding-bottom: 0; }
    .cl-admin-block__title { margin: 0 0 0.35rem; font-size: 1rem; font-weight: 600; }
    .cl-divider { border: 0; border-top: 1px solid #e0e0e0; margin: 0.75rem 0 1rem; }
    .cl-card__lede { color: #6a6e73; font-size: 0.8125rem; margin: 0 0 0.85rem; line-height: 1.45; }
    .cl-home-layout {
      display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, 380px);
      gap: 1.25rem; align-items: start;
    }
    .cl-page-narrow { max-width: 40rem; }
    .cl-secret {
      display: block; margin: 0.5rem 0 0; padding: 0.75rem 1rem;
      font-family: "RedHatMono", ui-monospace, Menlo, monospace; font-size: 0.8125rem;
      background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; word-break: break-all;
    }
    .cl-page-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
    .cl-filters-grid { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: flex-end; }
    .cl-filters-grid .cl-toolbar__actions { margin-left: auto; }
    .cl-id-cell { min-width: 10.5rem; max-width: 13rem; }
    .cl-sidebar { position: sticky; top: 1rem; }
    .cl-section-head { margin-bottom: 0.85rem; }
    .cl-section-head__hint { margin: 0.25rem 0 0; color: #6a6e73; font-size: 0.8125rem; }
    .cl-kpi {
      display: inline-flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;
      padding: 0.65rem 1rem; background: #fff; border: 1px solid #d2d2d2; border-radius: 6px;
      box-shadow: 0 1px 2px rgba(3, 3, 3, 0.05);
    }
    .cl-kpi__label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6a6e73; }
    .cl-kpi__value { font-size: 1.75rem; font-weight: 700; line-height: 1.1; }
    .cl-hint { color: #6a6e73; font-size: 0.8125rem; margin: 0.35rem 0 0; }
    .cl-callout {
      grid-column: 1 / -1; padding: 1rem 1.25rem; border-radius: 6px;
      background: #f0f0f0; border: 1px dashed #c7c7c7; color: #6a6e73; font-size: 0.875rem; text-align: center;
    }
    .cl-breadcrumb {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.5rem;
      font-size: 0.875rem; line-height: 1.4;
    }
    .cl-breadcrumb__link {
      color: #0066cc; font-weight: 500; text-decoration: none;
    }
    .cl-breadcrumb__link:hover { text-decoration: underline; }
    .cl-breadcrumb__sep { color: #8a8d90; font-weight: 400; user-select: none; padding: 0 0.1rem; }
    .cl-breadcrumb__current { color: #151515; font-weight: 600; text-decoration: none; }
    a.cl-breadcrumb__current:hover { color: #004080; text-decoration: underline; }
    .cl-page-hero {
      padding: 1rem 1.25rem 1.25rem;
      border-top: 3px solid #0066cc;
      margin-bottom: 0.25rem;
    }
    .cl-page-hero__rule {
      border: 0; border-top: 1px solid #e8e8e8; margin: 0.75rem 0 1rem;
    }
    .cl-page-hero__body {
      display: flex; flex-wrap: wrap; gap: 1rem 1.5rem;
      justify-content: space-between; align-items: flex-end;
    }
    .cl-page-hero__copy { flex: 1 1 16rem; min-width: 0; }
    .cl-page-hero__title { margin: 0.15rem 0 0; line-height: 1.2; }
    .cl-page-hero .cl-eyebrow { margin-bottom: 0.25rem; }
    .cl-page-hero .cl-hint { margin-top: 0.5rem; max-width: 36rem; line-height: 1.45; }
    .cl-toolbar {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: flex-end;
      padding: 0;
    }
    .cl-toolbar--card { padding: 0; }
    .cl-toolbar__field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 8.5rem; }
    #cl-project-filter .cl-toolbar__field { flex: 1 1 16rem; }
    .cl-toolbar__field label { font-size: 0.75rem; font-weight: 600; color: #6a6e73; }
    .cl-toolbar__actions { display: flex; gap: 0.5rem; align-items: center; padding-bottom: 2px; }
    .cl-page-hero--home { margin-bottom: 1.25rem; }
    .cl-page-hero--home .cl-page-hero__body { align-items: center; }
    .cl-stat-pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.4rem 0.75rem; border-radius: 999px;
      background: #e7f1fa; border: 1px solid #b9dafc; color: #004080;
      font-size: 0.8125rem; font-weight: 600;
    }
    .cl-list-toolbar {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: flex-end;
      margin: -0.25rem 0 1rem; padding: 0.85rem 1rem;
      background: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 4px;
    }
    .cl-list-toolbar .cl-toolbar__field { flex: 1 1 12rem; max-width: 22rem; margin: 0; }
    .cl-table-wrap { overflow-x: auto; border: 1px solid #e8e8e8; border-radius: 4px; }
    .cl-data-table { margin: 0; width: 100%; border-collapse: collapse; }
    .cl-data-table thead th {
      background: #f3f3f3; font-size: 0.6875rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em; color: #4d5258;
      padding: 0.65rem 1rem; border-bottom: 1px solid #d2d2d2; white-space: nowrap;
    }
    .cl-data-table tbody td {
      padding: 0.75rem 1rem; border-bottom: 1px solid #ededed; vertical-align: middle;
      font-size: 0.875rem;
    }
    .cl-data-table tbody tr:last-child td { border-bottom: 0; }
    .cl-data-table tbody tr:hover { background: #f5f9fd; }
    .cl-data-table .cl-col-actions { text-align: right; white-space: nowrap; }
    .cl-data-table .cl-col-created { color: #6a6e73; white-space: nowrap; }
    .cl-project-link {
      font-weight: 600; color: #0066cc; text-decoration: none;
    }
    .cl-project-link:hover { text-decoration: underline; color: #004080; }
    .cl-id {
      font-family: "RedHatMono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8125rem; font-weight: 500; color: #393939;
      background: transparent; border: 0; padding: 0; margin: 0;
    }
    .cl-data-table tbody tr:hover .cl-id { color: #151515; }
    .cl-id-group { display: inline-flex; align-items: center; gap: 0.25rem; max-width: 100%; }
    .cl-copy-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem; padding: 0; margin: 0;
      border: 0; border-radius: 3px; background: transparent;
      color: #6a6e73; cursor: pointer; flex-shrink: 0;
    }
    .cl-copy-icon:hover { color: #0066cc; background: #edf7ff; }
    .cl-copy-icon:focus-visible { outline: 2px solid #0066cc; outline-offset: 1px; }
    .cl-copy-icon__svg { width: 0.875rem; height: 0.875rem; display: block; }
    .cl-copy-icon--done { color: #3e8635; }
    .cl-card--admin { border-top: 3px solid #6a6e73; }
    .cl-card--list { border-top: 3px solid #0066cc; }
    .cl-project-table thead th { background: #fafafa; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6a6e73; }
    .cl-project-table tbody tr { cursor: default; }
    .cl-project-table tbody tr:hover { background: #f5f9fd; }
    .cl-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .cl-count { color: #6a6e73; font-weight: 400; font-size: 0.875rem; }
    .cl-dash { display: flex; flex-direction: column; gap: 1.25rem; }
    .cl-dash__charts {
      display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
      gap: 1.25rem; align-items: stretch;
    }
    .cl-dash__charts > * { min-width: 0; height: 100%; }
    .cl-dash__charts .pf-v5-c-card { display: flex; flex-direction: column; height: 100%; }
    .cl-dash__charts .pf-v5-c-card__body { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
    .cl-chart-wrap { overflow: hidden; max-width: 100%; width: 100%; }
    .cl-chart-wrap--overall { flex: 1 1 auto; min-height: 180px; max-height: 240px; }
    .cl-chart-wrap--overall .cl-chart { height: 100%; max-height: none; }
    .cl-chart { width: 100%; height: auto; max-height: 220px; display: block; }
    .cl-run-summary { display: flex; flex-direction: column; gap: 0.75rem; height: 100%; }
    .cl-run-summary__badges {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.5rem;
    }
    .cl-inspection--filled { display: block; }
    .cl-inspection__findings { max-width: 100%; }
    .cl-run-summary__meta { color: #6a6e73; font-size: 0.875rem; }
    .cl-inspection {
      display: grid; grid-template-columns: minmax(0, 1fr);
      gap: 1.25rem; align-items: start;
    }
    .cl-inspection--placeholder { display: block; }
    .cl-inspection > * { min-width: 0; }
    .cl-cats {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .cl-cats .cl-chart { max-height: 140px; }
    .cl-chart__area { opacity: 0.12; }
    .cl-chart__line { stroke-linecap: round; stroke-linejoin: round; }
    .cl-chart__point { cursor: pointer; outline: none; }
    .cl-chart__point:focus .cl-chart__dot,
    .cl-chart__point.is-selected .cl-chart__dot {
      r: 7;
      stroke: #151515;
      stroke-width: 3;
    }
    .cl-chart__point:hover .cl-chart__dot { r: 6.5; }
    .cl-runs-table thead th { background: #fafafa; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6a6e73; }
    .cl-runs-table tbody tr { cursor: pointer; }
    .cl-runs-table tbody tr:hover { background: #f5f9fd; }
    .cl-runs-table tbody tr.cl-active { background: var(--pf-v5-global--palette--blue-50, #e7f1fa); box-shadow: inset 3px 0 0 #0066cc; }
    .cl-tooltip {
      position: fixed; z-index: 400; pointer-events: none;
      background: #151515; color: #fff; padding: 0.45rem 0.65rem; border-radius: 4px;
      font-size: 0.8rem; max-width: 240px; display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
    }
    .cl-tooltip.is-visible { display: block; }
    .cl-delta-up { color: var(--pf-v5-global--success-color--100, #3e8635); }
    .cl-delta-down { color: var(--pf-v5-global--danger-color--100, #c9190b); }
    .cl-findings-table { margin: 0; }
    .cl-findings-table thead th {
      background: #fafafa; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.04em; color: #6a6e73; white-space: nowrap;
    }
    .cl-findings-table tbody td { vertical-align: top; font-size: 0.875rem; }
    .cl-findings-table .cl-findings-table__rule { font-family: "RedHatMono", ui-monospace, Menlo, monospace; font-size: 0.8125rem; }
    .cl-findings-table .cl-findings-table__file { font-family: "RedHatMono", ui-monospace, Menlo, monospace; font-size: 0.75rem; color: #6a6e73; }
    .cl-findings-table .cl-findings-table__msg { max-width: 28rem; line-height: 1.45; }
    .cl-inspection__findings .pf-v5-c-card__body { padding-top: 0; }
    .cl-hidden { display: none !important; }
    @media (max-width: 992px) {
      .cl-home-layout { grid-template-columns: 1fr; }
      .cl-sidebar { position: static; }
      .cl-dash__charts, .cl-cats, .cl-inspection { grid-template-columns: 1fr; }
      .cl-kpi { align-items: flex-start; }
      .cl-chart { max-height: 220px; }
      .cl-chart-wrap--overall { max-height: 220px; }
    }
  `;
}

function dashboardScript(initialSelected: number): string {
  return `<script>
    (function () {
      const payload = document.getElementById('cl-runs-data');
      if (!payload) return;
      const runs = JSON.parse(payload.textContent || '[]');
      const tooltip = document.getElementById('cl-tooltip');
      let selected = ${initialSelected};
      function esc(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function deltaHtml(curr, prev) {
        if (prev == null) return '';
        const d = curr - prev;
        if (d === 0) return '<span class="pf-v5-c-label pf-m-grey pf-m-compact"><span class="pf-v5-c-label__content">No change</span></span>';
        const cls = d > 0 ? 'cl-delta-up' : 'cl-delta-down';
        const sign = d > 0 ? '+' : '';
        return '<span class="' + cls + '"><strong>' + sign + d + '</strong> vs previous</span>';
      }

      function severityLabel(sev) {
        var s = String(sev || '').toLowerCase();
        var mod = 'pf-m-outline';
        if (s === 'critical') mod = 'pf-m-red';
        else if (s === 'high') mod = 'pf-m-orange';
        else if (s === 'medium') mod = 'pf-m-gold';
        else if (s === 'low') mod = 'pf-m-blue';
        return '<span class="pf-v5-c-label ' + mod + ' pf-m-compact"><span class="pf-v5-c-label__content">' + esc(sev) + '</span></span>';
      }

      function findingsHtml(run) {
        if (!run.findings.length) {
          return '<p class="pf-v5-c-empty-state__body pf-v5-u-p-md">No findings in this run.</p>';
        }
        var rows = run.findings.map(function (f) {
          return '<tr>' +
            '<td data-label="Severity">' + severityLabel(f.severity) + '</td>' +
            '<td data-label="Rule" class="cl-findings-table__rule"><code>' + esc(f.ruleId) + '</code></td>' +
            '<td data-label="Message" class="cl-findings-table__msg">' + esc(f.message) + '</td>' +
            '<td data-label="File" class="cl-findings-table__file">' + esc(f.file) + '</td>' +
            '</tr>';
        }).join('');
        return '<table class="pf-v5-c-table pf-m-compact pf-m-grid-md cl-findings-table" role="grid">' +
          '<thead><tr>' +
          '<th scope="col">Severity</th><th scope="col">Rule</th><th scope="col">Message</th><th scope="col">File</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table>';
      }

      function catsHtml(run) {
        return run.categories.map(function (c) {
          return '<div class="pf-v5-c-progress pf-m-sm pf-v5-u-mb-sm" role="progressbar" aria-valuenow="' + c.score +
            '" aria-valuemin="0" aria-valuemax="100"><div class="pf-v5-c-progress__description">' + c.label +
            ' <span class="pf-v5-u-float-right">' + c.score + '</span></div><div class="pf-v5-c-progress__bar"><div class="pf-v5-c-progress__indicator" style="width:' +
            c.score + '%"></div></div></div>';
        }).join('');
      }

      function renderDetail(i) {
        const run = runs[i];
        const prev = i > 0 ? runs[i - 1] : null;
        const summary = document.getElementById('cl-run-summary');
        const inspection = document.getElementById('cl-run-inspection');
        if (!run) return;
        if (summary) {
          summary.innerHTML =
            '<div class="cl-run-summary__badges">' +
            '<span class="pf-v5-c-label pf-m-outline"><span class="pf-v5-c-label__content">' + run.overall + '/100</span></span>' +
            '<span class="pf-v5-c-label pf-m-outline"><span class="pf-v5-c-label__content">Grade ' + esc(run.grade) + '</span></span>' +
            deltaHtml(run.overall, prev && prev.overall) +
            '</div>' +
            '<dl class="pf-v5-c-description-list pf-m-compact pf-v5-u-mb-0">' +
            '<div class="pf-v5-c-description-list__group"><dt class="pf-v5-c-description-list__term"><span class="pf-v5-c-description-list__text">SHA</span></dt><dd class="pf-v5-c-description-list__description"><code>' + esc(run.sha.slice(0, 12)) + '</code></dd></div>' +
            '<div class="pf-v5-c-description-list__group"><dt class="pf-v5-c-description-list__term"><span class="pf-v5-c-description-list__text">Branch</span></dt><dd class="pf-v5-c-description-list__description">' + esc(run.branch) + '</dd></div>' +
            '<div class="pf-v5-c-description-list__group"><dt class="pf-v5-c-description-list__term"><span class="pf-v5-c-description-list__text">Uploaded</span></dt><dd class="pf-v5-c-description-list__description">' + esc(run.createdAt.slice(0, 10)) + '</dd></div>' +
            '</dl>' +
            '<p class="cl-run-summary__meta pf-v5-u-mt-auto">Run ' + (i + 1) + ' of ' + runs.length + '</p>';
        }
        if (inspection) {
          inspection.classList.remove('cl-inspection--placeholder');
          inspection.innerHTML =
            '<div class="pf-v5-c-card cl-card cl-inspection__findings"><div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-md">Findings for this run</h2></div><div class="pf-v5-c-card__body">' + findingsHtml(run) + '</div></div>';
        }
      }

      function syncRunInUrl(run) {
        if (!run || !run.sha) return;
        const url = new URL(window.location.href);
        url.searchParams.set('run', run.sha);
        history.replaceState({}, '', url);
        const hidden = document.getElementById('cl-filter-run');
        if (hidden) hidden.value = run.sha;
      }

      function select(i) {
        if (i < 0 || i >= runs.length) return;
        selected = i;
        syncRunInUrl(runs[i]);
        document.querySelectorAll('.cl-chart__point').forEach(function (p) {
          const on = p.getAttribute('data-i') === String(i);
          p.classList.toggle('is-selected', on);
          const dot = p.querySelector('.cl-chart__dot');
          if (dot) dot.setAttribute('r', on ? '7' : '5');
        });
        document.querySelectorAll('tr[data-i]').forEach(function (row) {
          const on = row.getAttribute('data-i') === String(i);
          row.classList.toggle('cl-active', on);
          if (on) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        renderDetail(i);
      }

      function showTip(ev, i) {
        const run = runs[i];
        if (!tooltip || !run) return;
        tooltip.classList.add('is-visible');
        tooltip.innerHTML = '<strong>' + esc(run.sha.slice(0, 7)) + '</strong> · ' + esc(run.branch) + '<br/>Score ' + run.overall + ' · Grade ' + esc(run.grade) + '<br/><em>Click to inspect</em>';
        tooltip.style.left = (ev.clientX + 12) + 'px';
        tooltip.style.top = (ev.clientY + 12) + 'px';
      }

      document.querySelectorAll('.cl-chart__point').forEach(function (p) {
        p.addEventListener('mouseenter', function (ev) {
          const i = Number(p.getAttribute('data-i'));
          showTip(ev, i);
        });
        p.addEventListener('mousemove', function (ev) {
          const i = Number(p.getAttribute('data-i'));
          showTip(ev, i);
        });
        p.addEventListener('mouseleave', function () {
          if (tooltip) tooltip.classList.remove('is-visible');
        });
        p.addEventListener('click', function () {
          select(Number(p.getAttribute('data-i')));
        });
        p.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            select(Number(p.getAttribute('data-i')));
          }
        });
      });

      document.querySelectorAll('tr[data-i]').forEach(function (row) {
        row.addEventListener('click', function () {
          select(Number(row.getAttribute('data-i')));
        });
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
        if (ev.key === 'ArrowLeft') select(selected - 1);
        if (ev.key === 'ArrowRight') select(selected + 1);
      });

      if (selected >= 0) select(selected);
    })();
  </script>`;
}

function pageShell(title: string, body: string, extraTail = ''): string {
  return `<!doctype html>
<html lang="en" class="pf-m-redhat-font">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/patternfly/patternfly.min.css" />
  <style>${extraCss()}</style>
</head>
<body class="cl-app">
  <header class="cl-masthead">
    <a class="cl-brand" href="/">${brandLogoHtml()}<span>CognitiveLint CI</span></a>
  </header>
  <main class="cl-main">
    <div class="cl-content">
      ${body}
    </div>
  </main>
  <div id="cl-tooltip" class="cl-tooltip" role="tooltip"></div>
  ${extraTail}
</body>
</html>`;
}

function labeledField(id: string, label: string, control: string): string {
  return `<div class="pf-v5-c-form__group">
      <div class="pf-v5-c-form__group-label">
        <label class="pf-v5-c-form__label" for="${escapeHtml(id)}"><span class="pf-v5-c-form__label-text">${escapeHtml(label)}</span></label>
      </div>
      <div class="pf-v5-c-form__group-control">${control}</div>
    </div>`;
}

export function renderLandingPage(
  projects: PublicProject[],
  options?: { error?: string; deleted?: boolean; q?: string },
): string {
  const q = options?.q ?? '';
  const visible = filterProjects(projects, q);
  const rows = projects
    .map((p) => {
      const shown = visible.some((v) => v.id === p.id);
      const href = `/projects/${escapeHtml(p.id)}/trends`;
      return `<tr class="${shown ? '' : 'cl-hidden'}" data-search="${escapeHtml(`${p.name} ${p.id}`.toLowerCase())}">
        <td data-label="Name"><a class="cl-project-link" href="${href}">${escapeHtml(p.name)}</a></td>
        <td data-label="Project ID" class="cl-id-cell">
          <span class="cl-id-group">
            <code class="cl-id" title="${escapeHtml(p.id)}">${escapeHtml(formatProjectIdDisplay(p.id))}</code>
            <button type="button" class="cl-copy-icon cl-copy" aria-label="Copy project ID" title="Copy project ID" data-copy="${escapeHtml(p.id)}">${copyIconSvg()}</button>
          </span>
        </td>
        <td data-label="Created" class="cl-col-created">${escapeHtml(p.createdAt.slice(0, 10))}</td>
        <td data-label="Actions" class="cl-col-actions">
          <a class="pf-v5-c-button pf-m-primary pf-m-small" href="${href}">Trends</a>
        </td>
      </tr>`;
    })
    .join('');

  const alert = options?.error
    ? `<div class="pf-v5-c-alert pf-m-danger pf-m-inline" role="alert"><h4 class="pf-v5-c-alert__title">${escapeHtml(options.error)}</h4></div>`
    : options?.deleted
      ? `<div class="pf-v5-c-alert pf-m-success pf-m-inline" role="status"><h4 class="pf-v5-c-alert__title">Project deleted</h4></div>`
      : '';

  const tableBody =
    rows ||
    `<tr><td colspan="4"><div class="pf-v5-c-empty-state pf-m-sm"><div class="pf-v5-c-empty-state__content"><h2 class="pf-v5-c-title pf-m-md">No projects yet</h2><p>Create a project to get an admin token and an upload token.</p></div></div></td></tr>`;

  return pageShell(
    'CognitiveLint CI',
    `${alert ? `<div class="pf-v5-u-mb-md">${alert}</div>` : ''}
    <div class="cl-page-hero cl-card cl-page-hero--home">
      <p class="cl-eyebrow">Self-hosted CI</p>
      <div class="cl-page-hero__body">
        <div class="cl-page-hero__copy">
          <h1 class="pf-v5-c-title pf-m-2xl cl-page-hero__title">Projects</h1>
          <p class="cl-page-header__lede">Public trend dashboards per project. Create a project to mint admin and upload tokens for the CLI.</p>
        </div>
        <span class="cl-stat-pill">${projects.length} project${projects.length === 1 ? '' : 's'}</span>
      </div>
    </div>
    <div class="cl-home-layout">
      <div class="cl-home-main">
        <div class="pf-v5-c-card cl-card cl-card--list">
          <div class="pf-v5-c-card__header">
            <div class="pf-v5-c-card__header-main">
              <h2 class="pf-v5-c-title pf-m-md">All projects</h2>
            </div>
          </div>
          <div class="pf-v5-c-card__body">
            <form class="cl-list-toolbar" method="get" action="/" id="cl-project-filter">
              <div class="cl-toolbar__field">
                <label for="cl-project-q">Search</label>
                ${formControl(`<input type="search" id="cl-project-q" name="q" value="${escapeHtml(q)}" placeholder="Name or project ID" autocomplete="off" />`)}
              </div>
              <div class="cl-toolbar__actions">
                <button class="pf-v5-c-button pf-m-secondary pf-m-small" type="submit">Search</button>
                ${q ? `<a class="pf-v5-c-button pf-m-link pf-m-small" href="/">Clear</a>` : ''}
              </div>
            </form>
            <div class="cl-table-wrap">
            <table class="pf-v5-c-table pf-m-compact pf-m-grid-md cl-data-table cl-project-table" id="cl-project-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Project ID</th>
                  <th scope="col">Created</th>
                  <th scope="col" class="cl-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>${tableBody}</tbody>
            </table>
            </div>
            <p id="cl-project-empty" class="cl-hint pf-v5-u-mt-md ${projects.length > 0 && visible.length === 0 ? '' : 'cl-hidden'}">No projects match this search.</p>
          </div>
        </div>
      </div>
      <aside class="cl-sidebar">
        <div class="pf-v5-c-card cl-card cl-card--admin">
          <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-lg">Administration</h2></div>
          <div class="pf-v5-c-card__body">
            <div class="cl-admin-block">
              <h3 class="cl-admin-block__title">Create project</h3>
              <p class="cl-card__lede">Tokens are shown once after creation.</p>
              <form class="pf-v5-c-form" method="post" action="/projects/new">
                ${labeledField('name', 'Project name', formControl('<input type="text" id="name" name="name" required placeholder="my-app" />'))}
                <div class="pf-v5-c-form__group pf-m-action">
                  <button class="pf-v5-c-button pf-m-primary" type="submit">Create project</button>
                </div>
              </form>
            </div>
            <hr class="cl-divider" />
            <div class="cl-admin-block">
              <h3 class="cl-admin-block__title">Replace upload token</h3>
              <p class="cl-card__lede">Requires the project admin token.</p>
              <form class="pf-v5-c-form" method="post" action="/projects/upload-token">
                ${labeledField('projectId', 'Project ID', formControl('<input type="text" id="projectId" name="projectId" required />'))}
                ${labeledField('adminToken', 'Project admin token', formControl('<input type="password" id="adminToken" name="adminToken" required autocomplete="off" />'))}
                <div class="pf-v5-c-form__group pf-m-action">
                  <button class="pf-v5-c-button pf-m-secondary" type="submit">Issue new token</button>
                </div>
              </form>
            </div>
            <hr class="cl-divider" />
            <div class="cl-admin-block">
              <h3 class="cl-admin-block__title">Delete project</h3>
              <p class="cl-card__lede">Permanently removes all stored runs.</p>
              <form class="pf-v5-c-form" method="post" action="/projects/delete">
                ${labeledField('deleteProjectId', 'Project ID', formControl('<input type="text" id="deleteProjectId" name="projectId" required />'))}
                ${labeledField('deleteAdminToken', 'Project admin token', formControl('<input type="password" id="deleteAdminToken" name="adminToken" required autocomplete="off" />'))}
                <div class="pf-v5-c-form__group pf-m-action">
                  <button class="pf-v5-c-button pf-m-danger" type="submit">Delete project</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </div>`,
    `<script>
      (function () {
        const input = document.getElementById('cl-project-q');
        const empty = document.getElementById('cl-project-empty');
        function apply() {
          if (!input) return;
          const q = String(input.value || '').trim().toLowerCase();
          let shown = 0;
          document.querySelectorAll('#cl-project-table tbody tr[data-search]').forEach(function (row) {
            const hay = row.getAttribute('data-search') || '';
            const on = !q || hay.indexOf(q) !== -1;
            row.classList.toggle('cl-hidden', !on);
            if (on) shown += 1;
          });
          if (empty) empty.classList.toggle('cl-hidden', shown !== 0);
        }
        if (input) input.addEventListener('input', apply);
        function bindCopy(el, done) {
          el.addEventListener('click', function () {
            const value = el.getAttribute('data-copy') || '';
            if (!value || !navigator.clipboard) return;
            navigator.clipboard.writeText(value).then(function () {
              if (done) done(el);
            });
          });
        }
        document.querySelectorAll('.cl-copy').forEach(function (btn) {
          bindCopy(btn, function (b) {
            const prev = b.getAttribute('title') || 'Copy project ID';
            b.setAttribute('title', 'Copied');
            b.classList.add('cl-copy-icon--done');
            setTimeout(function () {
              b.setAttribute('title', prev);
              b.classList.remove('cl-copy-icon--done');
            }, 1500);
          });
        });
      })();
    </script>`,
  );
}

export function renderProjectCreatedPage(project: {
  id: string;
  name: string;
  token: string;
  adminToken: string;
}): string {
  return pageShell(
    `Project created — ${project.name}`,
    `<div class="pf-v5-c-alert pf-m-success pf-m-inline pf-v5-u-mb-md" aria-label="Project created">
        <h4 class="pf-v5-c-alert__title">Project created</h4>
        <div class="pf-v5-c-alert__description">Save both tokens now. They cannot be shown again.</div>
      </div>
      <div class="pf-v5-c-card cl-card">
        <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-card__title-text">${escapeHtml(project.name)}</h2></div>
        <div class="pf-v5-c-card__body">
          <dl class="pf-v5-c-description-list">
            <div class="pf-v5-c-description-list__group">
              <dt class="pf-v5-c-description-list__term">Project ID</dt>
              <dd class="pf-v5-c-description-list__description"><code id="cl-project-id">${escapeHtml(project.id)}</code></dd>
            </div>
            <div class="pf-v5-c-description-list__group">
              <dt class="pf-v5-c-description-list__term">Project admin token</dt>
              <dd class="pf-v5-c-description-list__description"><code id="cl-admin-token">${escapeHtml(project.adminToken)}</code></dd>
            </div>
            <div class="pf-v5-c-description-list__group">
              <dt class="pf-v5-c-description-list__term">Upload token</dt>
              <dd class="pf-v5-c-description-list__description"><code id="cl-upload-token">${escapeHtml(project.token)}</code></dd>
            </div>
            <div class="pf-v5-c-description-list__group">
              <dt class="pf-v5-c-description-list__term">Public trends</dt>
              <dd class="pf-v5-c-description-list__description"><a href="/projects/${escapeHtml(project.id)}/trends">Open dashboard (no token)</a></dd>
            </div>
          </dl>
          <div class="pf-v5-c-code-block pf-v5-u-mt-md">
            <div class="pf-v5-c-code-block__content">
              <pre class="pf-v5-c-code-block__pre"><code class="pf-v5-c-code-block__code">${escapeHtml(
                uploadCliCommand({
                  token: project.token,
                  projectId: project.id,
                }),
              )}</code></pre>
            </div>
          </div>
        </div>
      </div>`,
  );
}

export function renderUploadTokenPage(project: { id: string; name: string; token: string }): string {
  return pageShell(
    `New upload token — ${project.name}`,
    `<div class="cl-page-narrow">
      <div class="pf-v5-c-alert pf-m-success pf-m-inline pf-v5-u-mb-md" aria-label="Upload token issued">
        <h4 class="pf-v5-c-alert__title">New upload token</h4>
        <div class="pf-v5-c-alert__description">The previous upload token no longer works. Save this one now.</div>
      </div>
      <div class="pf-v5-c-card cl-card">
        <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-lg">${escapeHtml(project.name)}</h2></div>
        <div class="pf-v5-c-card__body">
          <p class="cl-eyebrow">Upload token</p>
          <code class="cl-secret" id="cl-upload-token">${escapeHtml(project.token)}</code>
          <div class="cl-page-actions">
            <a class="pf-v5-c-button pf-m-primary" href="/projects/${escapeHtml(project.id)}/trends">Open trends dashboard</a>
            <a class="pf-v5-c-button pf-m-link" href="/">All projects</a>
          </div>
          <div class="pf-v5-c-code-block pf-v5-u-mt-lg">
            <div class="pf-v5-c-code-block__content">
              <pre class="pf-v5-c-code-block__pre"><code class="pf-v5-c-code-block__code">${escapeHtml(
                uploadCliCommand({ token: project.token, projectId: project.id }),
              )}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  );
}

function runsPayload(runs: StoredRun[]): string {
  const data = runs.map((r) => ({
    sha: r.sha,
    branch: r.branch,
    overall: r.overall,
    grade: r.grade,
    createdAt: r.createdAt,
    categories: CATEGORY_META.map((cat) => ({
      id: cat.id,
      label: cat.label,
      score: r.run.report.score.categories.find((c) => c.category === cat.id)?.score ?? 0,
    })),
    findings: r.run.report.findings.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      file: f.location.file,
      message: f.message,
    })),
  }));
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function renderTrendsPage(
  projectName: string,
  allRuns: StoredRun[],
  projectId: string,
  filters: TrendsFilters = emptyTrendsFilters(),
): string {
  const runs = filterRuns(allRuns, filters);
  const filteredOut = allRuns.length > 0 && runs.length === 0;
  const branches = [...new Set(allRuns.map((r) => r.branch))].sort();
  const last = runs[runs.length - 1];
  const labels = runs.map((r) => `${r.sha.slice(0, 8)} · ${r.branch}`);
  const overall = runs.map((r) => r.overall);
  const drift = hasConfigDrift(runs);

  const branchOptions = [
    `<option value=""${filters.branch ? '' : ' selected'}>All branches</option>`,
    ...branches.map(
      (b) =>
        `<option value="${escapeHtml(b)}"${filters.branch === b ? ' selected' : ''}>${escapeHtml(b)}</option>`,
    ),
  ].join('');

  const gradeOptions = ['', 'A', 'B', 'C', 'D', 'F']
    .map((g) => {
      const label = g ? `Grade ${g}` : 'All grades';
      const selected = filters.grade === g ? ' selected' : '';
      return `<option value="${escapeHtml(g)}"${selected}>${label}</option>`;
    })
    .join('');

  const selectedIndex = resolveSelectedRunIndex(runs, filters.run);

  const toolbar = `<form class="cl-toolbar cl-filters-grid" method="get" action="/projects/${escapeHtml(projectId)}/trends">
        <input type="hidden" name="run" id="cl-filter-run" value="${escapeHtml(runs[selectedIndex]?.sha ?? filters.run)}" />
        <div class="cl-toolbar__field">
          <label for="cl-filter-branch">Branch</label>
          ${formControl(`<select id="cl-filter-branch" name="branch">${branchOptions}</select>`)}
        </div>
        <div class="cl-toolbar__field">
          <label for="cl-filter-grade">Grade</label>
          ${formControl(`<select id="cl-filter-grade" name="grade">${gradeOptions}</select>`)}
        </div>
        <div class="cl-toolbar__field">
          <label for="cl-filter-sha">SHA</label>
          ${formControl(`<input type="search" id="cl-filter-sha" name="sha" value="${escapeHtml(filters.sha)}" placeholder="abc123" />`)}
        </div>
        <div class="cl-toolbar__field">
          <label for="cl-filter-from">From</label>
          ${formControl(`<input type="date" id="cl-filter-from" name="from" value="${escapeHtml(filters.from)}" />`)}
        </div>
        <div class="cl-toolbar__field">
          <label for="cl-filter-to">To</label>
          ${formControl(`<input type="date" id="cl-filter-to" name="to" value="${escapeHtml(filters.to)}" />`)}
        </div>
        <div class="cl-toolbar__actions">
          <button class="pf-v5-c-button pf-m-secondary" type="submit">Apply filters</button>
          <a class="pf-v5-c-button pf-m-link" href="/projects/${escapeHtml(projectId)}/trends">Clear</a>
        </div>
      </form>`;

  const categoryCards = CATEGORY_META.map((cat) => {
    const series = runs.map((r) => {
      const row = r.run.report.score.categories.find((c) => c.category === cat.id);
      return row?.score ?? 0;
    });
    const latest = series[series.length - 1];
    return `<div class="cl-cats__item">
      <div class="pf-v5-c-card pf-m-compact cl-card cl-card--metric">
        <div class="pf-v5-c-card__header">
          <div class="pf-v5-c-card__header-main">
            <h3 class="pf-v5-c-title pf-m-md">${escapeHtml(cat.label)}</h3>
          </div>
          <div class="pf-v5-c-card__actions">
            <span class="pf-v5-c-label pf-m-outline">
              <span class="pf-v5-c-label__content">${latest === undefined ? '—' : latest}</span>
            </span>
          </div>
        </div>
        <div class="pf-v5-c-card__body"><div class="cl-chart-wrap">${sparkline(series, labels, cat.color, cat.id, { compact: true })}</div></div>
      </div>
    </div>`;
  }).join('\n');

  const rows = runs
    .map((r, i) => {
      const short = r.sha.slice(0, 8);
      return `<tr data-i="${i}">
        <td data-label="SHA"><code>${escapeHtml(short)}</code></td>
        <td data-label="Branch">${escapeHtml(r.branch)}</td>
        <td data-label="Overall">${r.overall}</td>
        <td data-label="Grade"><span class="pf-v5-c-label ${gradeModifier(r.grade)}"><span class="pf-v5-c-label__content">${escapeHtml(r.grade)}</span></span></td>
        <td data-label="Findings">${r.run.report.summary.totalFindings}</td>
      </tr>`;
    })
    .join('\n');

  const empty = `<div class="pf-v5-c-empty-state pf-m-lg">
      <div class="pf-v5-c-empty-state__content">
        <div class="pf-v5-c-empty-state__header">
          <h2 class="pf-v5-c-empty-state__title pf-v5-c-title pf-m-lg">No runs yet</h2>
        </div>
        <div class="pf-v5-c-empty-state__body">
          Upload a CognitiveLint scan to populate this dashboard.
        </div>
        <div class="pf-v5-c-empty-state__footer">
          <div class="pf-v5-c-code-block">
            <div class="pf-v5-c-code-block__content">
              <pre class="pf-v5-c-code-block__pre"><code class="pf-v5-c-code-block__code">${escapeHtml(
                uploadCliCommand({
                  token: '<project-token>',
                  projectId,
                }),
              )}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const scorePanel = last
    ? `<div class="cl-kpi" aria-label="Latest score">
         <span class="cl-kpi__label">Latest score</span>
         <span class="cl-kpi__value">${last.overall}<span class="pf-v5-u-font-size-md">/100</span></span>
         <span class="pf-v5-c-label ${gradeModifier(last.grade)}"><span class="pf-v5-c-label__content">Grade ${escapeHtml(last.grade)}</span></span>
       </div>`
    : `<div class="cl-kpi"><span class="cl-kpi__label">Latest score</span><span class="cl-kpi__value">—</span></div>`;

  const tail = `<script type="application/json" id="cl-runs-data">${runsPayload(runs)}</script>${dashboardScript(selectedIndex)}`;

  return pageShell(
    `Trends — ${projectName}`,
    `<div class="cl-dash">
      ${trendsPageHero(
        projectName,
        scorePanel,
        'Select a chart point or table row to inspect a run. Keyboard: ← → between runs.',
      )}
      <div class="pf-v5-c-card cl-card">
        <div class="pf-v5-c-card__header">
          <div class="pf-v5-c-card__header-main"><h2 class="pf-v5-c-title pf-m-md">Filters</h2></div>
        </div>
        <div class="pf-v5-c-card__body">${toolbar}</div>
      </div>
      ${
        drift
          ? `<div class="pf-v5-c-alert pf-m-warning pf-m-inline" aria-label="Config changed">
            <h4 class="pf-v5-c-alert__title">Config changed</h4>
            <div class="pf-v5-c-alert__description">Scores may not be comparable across these runs.</div>
          </div>`
          : ''
      }
      ${
        allRuns.length === 0
          ? empty
          : filteredOut
            ? `<div class="pf-v5-c-empty-state pf-m-sm"><div class="pf-v5-c-empty-state__content"><h2 class="pf-v5-c-title pf-m-lg">No runs match these filters</h2><p>Clear or widen the filters to see uploads again.</p></div></div>`
            : `<div class="cl-dash__charts">
        <div class="pf-v5-c-card cl-card">
          <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-lg">Overall</h2></div>
          <div class="pf-v5-c-card__body"><div class="cl-chart-wrap cl-chart-wrap--overall">${sparkline(overall, labels, '#0066cc', 'overall', { showXLabels: true })}</div></div>
        </div>
        <div class="pf-v5-c-card cl-card">
          <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-lg">Selected run</h2></div>
          <div class="pf-v5-c-card__body"><div class="cl-run-summary" id="cl-run-summary"><p class="cl-hint">Select a point on the chart or a row in the table.</p></div></div>
        </div>
      </div>
      <div class="cl-inspection cl-inspection--placeholder" id="cl-run-inspection">
        <div class="cl-callout">Findings for the selected run appear here. Category trends are in the grid below.</div>
      </div>
      <section>
        <div class="cl-section-head">
          <h2 class="pf-v5-c-title pf-m-lg">Categories</h2>
          <p class="cl-section-head__hint">Score trend per cognitive UX category</p>
        </div>
        <div class="cl-cats">${categoryCards}</div>
      </section>
      <div class="pf-v5-c-card cl-card">
        <div class="pf-v5-c-card__title"><h2 class="pf-v5-c-title pf-m-lg">Run history</h2></div>
        <div class="pf-v5-c-card__body">
          <table class="pf-v5-c-table pf-m-grid-md pf-m-compact cl-runs-table" role="grid">
            <thead>
              <tr role="row">
                <th scope="col">SHA</th>
                <th scope="col">Branch</th>
                <th scope="col">Overall</th>
                <th scope="col">Grade</th>
                <th scope="col">Findings</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">No runs yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>`
      }
    </div>`,
    tail,
  );
}
