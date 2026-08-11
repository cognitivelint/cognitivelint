import {
  confidenceBand,
  type AnalysisContext,
  type EnrichedFinding,
  type FixProposal,
  type PersonaId,
} from '../types.js';

function inferLabelFromContext(context: AnalysisContext, finding: EnrichedFinding): string {
  const ids = context.localIdentifiers ?? [];
  const handlers = ids.filter((id) =>
    /^(delete|remove|save|create|update|edit|open|close|cancel|submit|add|clear)/i.test(id),
  );
  if (handlers[0]) {
    return handlers[0]
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^(on)/, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  if (context.componentName) {
    const name = context.componentName.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (/delete|remove/i.test(finding.snippet ?? '') || /delete|remove/i.test(finding.message)) {
      return `Delete ${name.replace(/Page|View|Dialog|Modal|Form|Button/gi, '').trim() || 'item'}`;
    }
  }

  if (/delete|trash|remove/i.test(finding.snippet ?? '')) return 'Delete item';
  if (/settings|gear|cog/i.test(finding.snippet ?? '')) return 'Settings';
  if (/edit|pencil/i.test(finding.snippet ?? '')) return 'Edit';
  if (/close|x-?icon/i.test(finding.snippet ?? '')) return 'Close';
  return 'Perform action';
}

function replaceRange(
  source: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
  replacement: string,
): { original: string; next: string } {
  const lines = source.split('\n');
  const startIdx = lines.slice(0, startLine - 1).join('\n').length + (startLine > 1 ? 1 : 0) + (startColumn - 1);
  const endIdx = lines.slice(0, endLine - 1).join('\n').length + (endLine > 1 ? 1 : 0) + (endColumn - 1);
  const original = source.slice(startIdx, endIdx);
  const next = source.slice(0, startIdx) + replacement + source.slice(endIdx);
  return { original, next };
}

function makeDiff(original: string, replacement: string): string {
  const oldLines = original.split('\n');
  const newLines = replacement.split('\n');
  const lines = [
    '```diff',
    ...oldLines.map((l) => `- ${l}`),
    ...newLines.map((l) => `+ ${l}`),
    '```',
  ];
  return lines.join('\n');
}

function fixIconOnlyButton(snippet: string, label: string): string | null {
  if (!/<button\b/i.test(snippet)) return null;
  if (/aria-label\s*=/.test(snippet)) return null;

  let next = snippet.replace(/<button\b([^>]*)>/i, (_m, attrs: string) => {
    return `<button${attrs} aria-label="${label}">`;
  });

  next = next.replace(/<(Svg|svg|[A-Z][A-Za-z0-9]*Icon)\b([^>]*)\/>/g, (_m, tag: string, attrs: string) => {
    if (/aria-hidden/.test(attrs)) return `<${tag}${attrs}/>`;
    return `<${tag}${attrs} aria-hidden="true" />`;
  });

  next = next.replace(/<(Svg|svg|[A-Z][A-Za-z0-9]*Icon)\b([^>]*)>([\s\S]*?)<\/\1>/g, (_m, tag: string, attrs: string, inner: string) => {
    if (/aria-hidden/.test(attrs)) return `<${tag}${attrs}>${inner}</${tag}>`;
    return `<${tag}${attrs} aria-hidden="true">${inner}</${tag}>`;
  });

  // Prefer sr-only text pattern from PRD when icon child present
  if (/<[A-Z][A-Za-z0-9]*Icon\b|<svg\b/i.test(snippet) && !/sr-only/.test(snippet)) {
    const withSr = snippet
      .replace(/<button\b([^>]*)>/i, `<button$1>`)
      .replace(
        /(<(?:[A-Z][A-Za-z0-9]*Icon|svg)\b[^>]*\/?>)/i,
        (icon) => {
          const hidden = /aria-hidden/.test(icon)
            ? icon
            : icon.replace(/\/?>/, (end) => ` aria-hidden="true"${end === '/>' ? ' />' : '>'}`);
          return `${hidden}\n  <span className="sr-only">${label}</span>`;
        },
      );
    if (withSr !== snippet) return withSr;
  }

  return next === snippet ? null : next;
}

function fixClickOnlyDiv(snippet: string): string | null {
  const re = /<(div|span)(\b[^>]*\bonClick\b[^>]*)>([\s\S]*?)<\/\1>/i;
  const m = snippet.match(re);
  if (m) {
    const attrs = (m[2] ?? '')
      .replace(/\brole\s*=\s*["'][^"']*["']/g, '')
      .replace(/\btabIndex\s*=\s*\{[^}]+\}/g, '')
      .replace(/\btabindex\s*=\s*["'][^"']*["']/gi, '');
    const inner = m[3] ?? '';
    return snippet.replace(m[0], `<button${attrs}>${inner}</button>`);
  }

  // Opening tag only
  const open = snippet.match(/<(div|span)(\b[^>]*\bonClick\b[^>]*)>/i);
  if (!open) return null;
  const attrs = (open[2] ?? '')
    .replace(/\brole\s*=\s*["'][^"']*["']/g, '')
    .replace(/\btabIndex\s*=\s*\{[^}]+\}/g, '')
    .replace(/\btabindex\s*=\s*["'][^"']*["']/gi, '');
  return snippet.replace(open[0], `<button${attrs}>`);
}

function fixAmbiguousLabel(snippet: string, label: string): string | null {
  const m = snippet.match(/<button\b([^>]*)>([\s\S]*?)<\/button>/i);
  if (!m) return null;
  const inner = m[2] ?? '';
  const text = inner.replace(/<[^>]+>/g, '').trim();
  if (!text) return null;
  if (text.toLowerCase() === label.toLowerCase()) return null;
  // Only upgrade short generic labels
  if (text.split(/\s+/).length > 2) return null;
  return snippet.replace(inner, label);
}

function fixMissingAlt(snippet: string): string | null {
  if (!/<img\b/i.test(snippet)) return null;
  if (/\balt\s*=/.test(snippet)) return null;
  return snippet.replace(/<img\b/i, '<img alt=""');
}

/**
 * Generate the smallest safe fix using deterministic heuristics.
 * AI path can override when configured.
 */
export function generateHeuristicFix(
  finding: EnrichedFinding,
  context: AnalysisContext,
): FixProposal | null {
  const snippet = finding.snippet ?? context.nearbyJsx ?? '';
  if (!snippet) return null;

  const label = inferLabelFromContext(context, finding);
  let replacement: string | null = null;
  let description = '';
  let confidence = 75;
  let persona: PersonaId = finding.primaryPersona;

  switch (finding.ruleId) {
    case 'screen-reader/icon-only-button':
    case 'jsx-a11y/control-has-associated-label':
      replacement = fixIconOnlyButton(snippet, label);
      description = `Add accessible name "${label}" and hide decorative icon from the accessibility tree.`;
      confidence = 92;
      persona = 'screen-reader';
      break;
    case 'keyboard/click-only-div':
    case 'jsx-a11y/no-static-element-interactions':
    case 'jsx-a11y/click-events-have-key-events':
      replacement = fixClickOnlyDiv(snippet);
      description = 'Replace non-semantic interactive element with <button>.';
      confidence = 88;
      persona = 'keyboard';
      break;
    case 'cognitive/ambiguous-action-label':
    case 'cognitive/destructive-no-context': {
      const specific = label.includes(' ') ? label : `${finding.snippet?.match(/>([^<]+)</)?.[1]?.trim() ?? 'Delete'} item`;
      const upgraded = /delete/i.test(snippet)
        ? (context.componentName
          ? `Delete ${context.componentName.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Page|View|Dialog|Modal|Form|Button|Card/gi, '').trim() || 'item'}`
          : 'Delete item')
        : specific;
      replacement = fixAmbiguousLabel(snippet, upgraded);
      description = `Clarify action label to "${upgraded}".`;
      confidence = 78;
      persona = 'cognitive';
      break;
    }
    case 'jsx-a11y/alt-text':
      replacement = fixMissingAlt(snippet);
      description = 'Add an alt attribute (use empty alt for decorative images).';
      confidence = 70;
      persona = 'screen-reader';
      break;
    default:
      return null;
  }

  if (!replacement || replacement === snippet) return null;

  const loc = finding.location;
  // For multi-line snippets from regex, use finding range when snippet matches source slice
  const { original } = replaceRange(
    context.sourceCode,
    loc.startLine,
    loc.startColumn,
    loc.endLine,
    loc.endColumn,
    replacement,
  );

  // If range extraction doesn't match snippet, still propose replacement of snippet text in source
  let finalOriginal = original;
  let finalReplacement = replacement;
  let range = {
    startLine: loc.startLine,
    startColumn: loc.startColumn,
    endLine: loc.endLine,
    endColumn: loc.endColumn,
  };

  if (original !== snippet && context.sourceCode.includes(snippet)) {
    const idx = context.sourceCode.indexOf(snippet);
    const before = context.sourceCode.slice(0, idx);
    const startLine = before.split('\n').length;
    const startColumn = (before.split('\n').pop()?.length ?? 0) + 1;
    const endBefore = context.sourceCode.slice(0, idx + snippet.length);
    const endLine = endBefore.split('\n').length;
    const endColumn = (endBefore.split('\n').pop()?.length ?? 0) + 1;
    finalOriginal = snippet;
    finalReplacement = replacement;
    range = { startLine, startColumn, endLine, endColumn };
  }

  return {
    findingId: finding.id,
    description,
    diff: makeDiff(finalOriginal, finalReplacement),
    replacement: finalReplacement,
    original: finalOriginal,
    range,
    confidence,
    confidenceBand: confidenceBand(confidence),
    persona,
  };
}

export function applyFixToSource(sourceCode: string, fix: FixProposal): string {
  if (fix.original && sourceCode.includes(fix.original)) {
    return sourceCode.replace(fix.original, fix.replacement);
  }
  const { next } = replaceRange(
    sourceCode,
    fix.range.startLine,
    fix.range.startColumn,
    fix.range.endLine,
    fix.range.endColumn,
    fix.replacement,
  );
  return next;
}
