import {
  PERSONA_ICONS,
  PERSONA_LABELS,
  confidenceBand,
  type AccessibilityFinding,
  type AnalysisContext,
  type HumanImpact,
  type PersonaId,
} from '../types.js';

interface ImpactTemplate {
  impactLevel: HumanImpact['impactLevel'];
  whatHappened: string;
  whoIsAffected: string;
  whatTheyExperience: string;
  whyItMatters: string;
  whatToDo: string;
  confidence: number;
  wcagRefs?: string[];
}

const RULE_TEMPLATES: Record<string, ImpactTemplate> = {
  'jsx-a11y/control-has-associated-label': {
    impactLevel: 'high',
    whatHappened: 'This control has no accessible name.',
    whoIsAffected: 'Screen-reader users',
    whatTheyExperience: 'The control may be announced only as its role (for example, "button").',
    whyItMatters: 'The user cannot determine what action the control performs without extra exploration.',
    whatToDo: 'Provide a meaningful accessible name via visible text, aria-label, or aria-labelledby.',
    confidence: 97,
    wcagRefs: ['WCAG 4.1.2 Name, Role, Value', 'WCAG 2.5.3 Label in Name'],
  },
  'jsx-a11y/alt-text': {
    impactLevel: 'high',
    whatHappened: 'This image is missing alternative text.',
    whoIsAffected: 'Screen-reader users and users who cannot see images',
    whatTheyExperience: 'The image may be skipped or announced as a generic "image" with no meaning.',
    whyItMatters: 'Important visual information is unavailable through non-visual channels.',
    whatToDo: 'Add a descriptive alt attribute, or alt="" if the image is decorative.',
    confidence: 96,
    wcagRefs: ['WCAG 1.1.1 Non-text Content'],
  },
  'jsx-a11y/label-has-associated-control': {
    impactLevel: 'high',
    whatHappened: 'This label is not associated with a form control.',
    whoIsAffected: 'Screen-reader users and users who click labels to focus inputs',
    whatTheyExperience: 'The purpose of the field may be unclear when navigating by form control.',
    whyItMatters: 'Users may enter data in the wrong field or miss required information.',
    whatToDo: 'Associate the label using htmlFor/id or wrap the control inside the label.',
    confidence: 95,
    wcagRefs: ['WCAG 1.3.1 Info and Relationships', 'WCAG 3.3.2 Labels or Instructions'],
  },
  'jsx-a11y/click-events-have-key-events': {
    impactLevel: 'high',
    whatHappened: 'This interaction depends on a mouse click without a keyboard equivalent.',
    whoIsAffected: 'Keyboard-only users',
    whatTheyExperience: 'They may not be able to activate this control with Enter or Space.',
    whyItMatters: 'The workflow becomes unreachable without a pointing device.',
    whatToDo: 'Add keyboard handlers or prefer a semantic interactive element such as <button>.',
    confidence: 94,
    wcagRefs: ['WCAG 2.1.1 Keyboard'],
  },
  'jsx-a11y/no-static-element-interactions': {
    impactLevel: 'high',
    whatHappened: 'A static element is used as an interactive control.',
    whoIsAffected: 'Keyboard-only users and assistive technology users',
    whatTheyExperience: 'The element may not be focusable or announced as interactive.',
    whyItMatters: 'Users cannot reliably reach or understand the control.',
    whatToDo: 'Use a semantic interactive element such as <button>, or add an appropriate role and tabIndex with keyboard support.',
    confidence: 93,
    wcagRefs: ['WCAG 2.1.1 Keyboard', 'WCAG 4.1.2 Name, Role, Value'],
  },
  'jsx-a11y/interactive-supports-focus': {
    impactLevel: 'high',
    whatHappened: 'An interactive element cannot receive keyboard focus.',
    whoIsAffected: 'Keyboard-only users',
    whatTheyExperience: 'They cannot tab to this control.',
    whyItMatters: 'Focusability is required for keyboard operation.',
    whatToDo: 'Ensure the element is focusable (native interactive element or tabIndex={0}).',
    confidence: 94,
    wcagRefs: ['WCAG 2.1.1 Keyboard'],
  },
  'jsx-a11y/heading-has-content': {
    impactLevel: 'medium',
    whatHappened: 'A heading element has no accessible content.',
    whoIsAffected: 'Screen-reader users who navigate by headings',
    whatTheyExperience: 'An empty heading appears in the heading list.',
    whyItMatters: 'Heading navigation becomes noisy and less useful.',
    whatToDo: 'Provide meaningful heading text or remove the empty heading.',
    confidence: 92,
    wcagRefs: ['WCAG 1.3.1 Info and Relationships', 'WCAG 2.4.6 Headings and Labels'],
  },
  'jsx-a11y/anchor-has-content': {
    impactLevel: 'high',
    whatHappened: 'A link has no accessible content.',
    whoIsAffected: 'Screen-reader users',
    whatTheyExperience: 'The link may be announced only as "link".',
    whyItMatters: 'Users cannot tell where the link goes.',
    whatToDo: 'Provide link text or an aria-label that describes the destination.',
    confidence: 95,
    wcagRefs: ['WCAG 2.4.4 Link Purpose'],
  },
  'jsx-a11y/tabindex-no-positive': {
    impactLevel: 'medium',
    whatHappened: 'A positive tabIndex changes the natural focus order.',
    whoIsAffected: 'Keyboard-only users',
    whatTheyExperience: 'Focus may jump in an unexpected order.',
    whyItMatters: 'Unpredictable focus order increases cognitive load and can skip content.',
    whatToDo: 'Use tabIndex={0} or {-1} instead of positive values; rely on DOM order.',
    confidence: 90,
    wcagRefs: ['WCAG 2.4.3 Focus Order'],
  },
  'jsx-a11y/no-autofocus': {
    impactLevel: 'medium',
    whatHappened: 'Autofocus forces focus movement on page load or update.',
    whoIsAffected: 'Users with cognitive disabilities and screen-reader users',
    whatTheyExperience: 'Focus jumps unexpectedly, disrupting reading or form completion.',
    whyItMatters: 'Unexpected focus changes increase cognitive burden and disorientation.',
    whatToDo: 'Avoid autofocus except in well-justified single-purpose dialogs.',
    confidence: 85,
    wcagRefs: ['WCAG 2.4.3 Focus Order'],
  },
  'screen-reader/icon-only-button': {
    impactLevel: 'high',
    whatHappened: 'This button has no accessible name.',
    whoIsAffected: 'Screen-reader users',
    whatTheyExperience: 'A screen-reader user may hear only "button".',
    whyItMatters: 'If several controls appear together, identifying the correct action becomes difficult.',
    whatToDo: 'Provide a meaningful accessible name and hide decorative icons from the accessibility tree.',
    confidence: 97,
    wcagRefs: ['WCAG 4.1.2 Name, Role, Value'],
  },
  'keyboard/click-only-div': {
    impactLevel: 'high',
    whatHappened: 'This interaction depends on a mouse click.',
    whoIsAffected: 'Keyboard-only users',
    whatTheyExperience: 'A keyboard-only user may not be able to reach or activate this control.',
    whyItMatters: 'The feature becomes unusable without a pointing device.',
    whatToDo: 'Prefer a semantic interactive element such as <button>.',
    confidence: 94,
    wcagRefs: ['WCAG 2.1.1 Keyboard'],
  },
  'cognitive/ambiguous-action-label': {
    impactLevel: 'potential',
    whatHappened: 'The action label does not identify what it applies to.',
    whoIsAffected: 'Users with cognitive accessibility needs, and anyone scanning quickly',
    whatTheyExperience: 'They must infer the target of the action from surrounding context.',
    whyItMatters: 'Ambiguous labels increase memory load and the risk of choosing the wrong action.',
    whatToDo: 'Use a specific label such as "Delete project" rather than "Delete".',
    confidence: 78,
    wcagRefs: ['WCAG 2.4.6 Headings and Labels', 'WCAG 3.3.2 Labels or Instructions'],
  },
  'cognitive/destructive-no-context': {
    impactLevel: 'potential',
    whatHappened: 'A destructive action uses a generic label.',
    whoIsAffected: 'Users with cognitive accessibility needs',
    whatTheyExperience: 'They may not be sure what will be deleted or affected.',
    whyItMatters: 'Consequential actions need clear identification to prevent irreversible mistakes.',
    whatToDo: 'Name the target explicitly and consider a confirmation step for destructive actions.',
    confidence: 80,
    wcagRefs: ['WCAG 3.3.1 Error Identification', 'WCAG 3.3.4 Error Prevention'],
  },
};

const PERSONA_DEFAULTS: Record<PersonaId, ImpactTemplate> = {
  'screen-reader': {
    impactLevel: 'medium',
    whatHappened: 'Assistive technology may not receive enough semantic information.',
    whoIsAffected: 'Screen-reader users',
    whatTheyExperience: 'The interface may be incomplete or confusing when announced.',
    whyItMatters: 'Missing semantics force users to guess structure and purpose.',
    whatToDo: 'Ensure accessible names, roles, and states are exposed correctly.',
    confidence: 70,
  },
  keyboard: {
    impactLevel: 'medium',
    whatHappened: 'Keyboard interaction may be incomplete for this control.',
    whoIsAffected: 'Keyboard-only users',
    whatTheyExperience: 'They may be unable to reach or operate the control.',
    whyItMatters: 'All functionality must be available from the keyboard.',
    whatToDo: 'Ensure focusability and keyboard activation for interactive elements.',
    confidence: 70,
  },
  cognitive: {
    impactLevel: 'potential',
    whatHappened: 'This interaction may create unnecessary cognitive burden.',
    whoIsAffected: 'Users with cognitive accessibility needs',
    whatTheyExperience: 'Ambiguity, memory load, or unclear recovery paths.',
    whyItMatters: 'Clear language and predictable actions reduce mental effort.',
    whatToDo: 'Use specific labels, clear feedback, and recovery instructions.',
    confidence: 65,
  },
};

function buildNarrative(
  persona: PersonaId,
  template: ImpactTemplate,
  finding: AccessibilityFinding,
): string {
  const icon = PERSONA_ICONS[persona];
  const label = PERSONA_LABELS[persona];
  const impact =
    template.impactLevel === 'high'
      ? 'High human impact'
      : template.impactLevel === 'potential'
        ? 'Potential human impact'
        : template.impactLevel === 'medium'
          ? 'Medium human impact'
          : 'Low human impact';

  return [
    `${icon} **${label}**`,
    '',
    `**${impact}**`,
    '',
    template.whatHappened,
    '',
    template.whatTheyExperience,
    '',
    template.whyItMatters,
    '',
    `**What to do:** ${template.whatToDo}`,
    '',
    `**Confidence:** ${template.confidence}%`,
    '',
    `_Technical signal:_ ${finding.ruleId} — ${finding.message}`,
  ].join('\n');
}

/**
 * Deterministic human-impact layer derived from trusted jsx-a11y / semantic signals.
 * Used as the default explanation path; AI can refine when available.
 */
export function explainWithPersona(
  finding: AccessibilityFinding,
  persona: PersonaId = finding.primaryPersona,
  _context?: AnalysisContext,
): HumanImpact {
  const template = RULE_TEMPLATES[finding.ruleId] ?? PERSONA_DEFAULTS[persona];
  const narrative = buildNarrative(persona, template, finding);

  return {
    persona,
    personaLabel: PERSONA_LABELS[persona],
    impactLevel: template.impactLevel,
    whatHappened: template.whatHappened,
    whoIsAffected: template.whoIsAffected,
    whatTheyExperience: template.whatTheyExperience,
    whyItMatters: template.whyItMatters,
    whatToDo: template.whatToDo,
    narrative,
    confidence: template.confidence,
    confidenceBand: confidenceBand(template.confidence),
    ...(template.wcagRefs ? { wcagRefs: template.wcagRefs } : {}),
  };
}

export function getWcagGuidance(finding: AccessibilityFinding): string {
  const impact = explainWithPersona(finding);
  const refs = impact.wcagRefs?.length
    ? impact.wcagRefs.map((r) => `- ${r}`).join('\n')
    : '- Review WCAG 2.2 success criteria related to name, role, keyboard, and labels.';

  return [
    `📖 **WCAG guidance for \`${finding.ruleId}\`**`,
    '',
    impact.whatHappened,
    '',
    'Relevant criteria:',
    refs,
    '',
    `Recommended remediation: ${impact.whatToDo}`,
  ].join('\n');
}

/**
 * Single "Why?" explanation: human impact + WCAG in one place.
 * Used by the Quick Fix menu — not split across multiple near-duplicate actions.
 */
export function formatWhyExplanation(
  finding: AccessibilityFinding,
  impact: HumanImpact = explainWithPersona(finding),
): string {
  const refs = impact.wcagRefs?.length
    ? impact.wcagRefs.map((r) => `- ${r}`).join('\n')
    : '- Review WCAG 2.2 success criteria related to name, role, keyboard, and labels.';

  const impactLabel =
    impact.impactLevel === 'high'
      ? 'High human impact'
      : impact.impactLevel === 'potential'
        ? 'Potential human impact'
        : impact.impactLevel === 'medium'
          ? 'Medium human impact'
          : 'Low human impact';

  return [
    `**Why does this matter?**`,
    '',
    `${PERSONA_ICONS[impact.persona]} ${impact.personaLabel} · **${impactLabel}** · ${impact.confidence}% confidence`,
    '',
    `**What happened**`,
    impact.whatHappened,
    '',
    `**Who is affected**`,
    impact.whoIsAffected,
    '',
    `**What they experience**`,
    impact.whatTheyExperience,
    '',
    `**Why it matters**`,
    impact.whyItMatters,
    '',
    `**What to do**`,
    impact.whatToDo,
    '',
    `**WCAG**`,
    refs,
    '',
    `_Technical signal:_ \`${finding.ruleId}\` — ${finding.message}`,
  ].join('\n');
}
