import { describe, expect, it } from 'vitest';
import {
  analyzeFile,
  applyFixToSource,
  buildContext,
  explainWithPersona,
  generateHeuristicFix,
  runJsxA11y,
  runSemanticScan,
  validateFix,
} from '../src/index.js';

describe('runJsxA11y', () => {
  it('flags images missing alt text', () => {
    const code = `export function Hero() {
  return <img src="/hero.png" />;
}`;
    const findings = runJsxA11y(code, 'Hero.tsx');
    expect(findings.some((f) => f.ruleId === 'jsx-a11y/alt-text')).toBe(true);
  });

  it('flags click handlers without keyboard events on non-interactive elements', () => {
    const code = `export function Row() {
  return <div onClick={() => {}}>Settings</div>;
}`;
    const findings = runJsxA11y(code, 'Row.tsx');
    expect(
      findings.some(
        (f) =>
          f.ruleId === 'jsx-a11y/click-events-have-key-events' ||
          f.ruleId === 'jsx-a11y/no-static-element-interactions',
      ),
    ).toBe(true);
  });
});

describe('semantic scanner', () => {
  it('detects icon-only buttons without accessible names', () => {
    const code = `function Toolbar() {
  return (
    <button onClick={deleteProject}>
      <TrashIcon />
    </button>
  );
}`;
    const findings = runSemanticScan(code, 'Toolbar.tsx');
    expect(findings.some((f) => f.ruleId === 'screen-reader/icon-only-button')).toBe(true);
  });

  it('detects ambiguous destructive labels', () => {
    const code = `function ProjectCard() {
  return <button>Delete</button>;
}`;
    const findings = runSemanticScan(code, 'ProjectCard.tsx');
    expect(
      findings.some(
        (f) =>
          f.ruleId === 'cognitive/ambiguous-action-label' ||
          f.ruleId === 'cognitive/destructive-no-context',
      ),
    ).toBe(true);
  });
});

describe('human impact personas', () => {
  it('explains screen reader impact for icon-only buttons', () => {
    const findings = runSemanticScan(
      `<button onClick={deleteProject}><TrashIcon /></button>`,
      'x.tsx',
    );
    const finding = findings[0]!;
    const impact = explainWithPersona(finding);
    expect(impact.persona).toBe('screen-reader');
    expect(impact.narrative).toContain('Screen Reader Agent');
    expect(impact.whatTheyExperience.toLowerCase()).toContain('button');
    expect(impact.confidence).toBeGreaterThanOrEqual(90);
  });

  it('explains keyboard impact for click-only divs', () => {
    const findings = runSemanticScan(
      `<div onClick={openDialog}>Settings</div>`,
      'x.tsx',
    );
    const finding = findings.find((f) => f.ruleId === 'keyboard/click-only-div')!;
    const impact = explainWithPersona(finding);
    expect(impact.persona).toBe('keyboard');
    expect(impact.narrative).toContain('Keyboard Agent');
  });

  it('combines human impact and WCAG in Why? explanation', async () => {
    const { formatWhyExplanation } = await import('../src/index.js');
    const code = `export function Settings() {
  return <div onClick={openDialog}>Settings</div>;
}
`;
    const result = await analyzeFile({ filePath: 'Settings.tsx', sourceCode: code });
    const finding = result.findings[0]!;
    const why = formatWhyExplanation(finding, finding.humanImpact);
    expect(why).toContain('Why does this matter?');
    expect(why).toContain('Who is affected');
    expect(why).toContain('WCAG');
    expect(why).toContain(finding.ruleId);
  });
});

describe('fix generation + validation', () => {
  it('generates and validates a fix for icon-only button', async () => {
    const code = `export function Toolbar() {
  return (
    <button onClick={deleteProject}>
      <TrashIcon />
    </button>
  );
}
`;
    const result = await analyzeFile({ filePath: 'Toolbar.tsx', sourceCode: code, enrich: true });
    const finding = result.findings.find((f) => f.ruleId === 'screen-reader/icon-only-button');
    expect(finding).toBeTruthy();

    const context = buildContext('Toolbar.tsx', code, finding, result.findings);
    const fix = generateHeuristicFix(finding!, context);
    expect(fix).toBeTruthy();
    expect(fix!.diff).toContain('+');
    expect(fix!.replacement.toLowerCase()).toMatch(/aria-label|sr-only/);

    const validation = validateFix(code, 'Toolbar.tsx', fix!, finding!.ruleId);
    expect(validation.messages.length).toBeGreaterThan(0);

    const patched = applyFixToSource(code, fix!);
    expect(patched).not.toEqual(code);
    expect(patched.toLowerCase()).toMatch(/aria-label|sr-only/);
  });

  it('generates a button replacement for click-only div', async () => {
    const code = `export function Settings() {
  return <div onClick={openDialog}>Settings</div>;
}
`;
    const result = await analyzeFile({ filePath: 'Settings.tsx', sourceCode: code });
    const finding = result.findings.find(
      (f) =>
        f.ruleId === 'keyboard/click-only-div' ||
        f.ruleId === 'jsx-a11y/no-static-element-interactions' ||
        f.ruleId === 'jsx-a11y/click-events-have-key-events',
    );
    expect(finding).toBeTruthy();
    const context = buildContext('Settings.tsx', code, finding, result.findings);
    const fix = generateHeuristicFix(finding!, context);
    expect(fix).toBeTruthy();
    expect(fix!.replacement).toContain('button');
  });
});

describe('analyzeFile end-to-end', () => {
  it('returns enriched findings for the PRD example', async () => {
    const code = `export function ProjectActions() {
  return (
    <button onClick={deleteProject}>
      <TrashIcon />
    </button>
  );
}
`;
    const result = await analyzeFile({ filePath: 'ProjectActions.tsx', sourceCode: code });
    expect(result.findings.length).toBeGreaterThan(0);
    const first = result.findings[0]!;
    expect(first.humanImpact.narrative).toBeTruthy();
    expect(first.humanImpact.confidenceBand).toMatch(/high|medium|low/);
  });
});
