export * from './types.js';
export { runJsxA11y, validateWithJsxA11y, RULE_PERSONA_MAP } from './eslint-runner.js';
export { runSemanticScan } from './semantic-scanner.js';
export { buildContext } from './context.js';
export { explainWithPersona, getWcagGuidance } from './personas/impact.js';
export {
  AccessibilityAIGateway,
  createGateway,
  aiAvailable,
  askPersona,
} from './ai/gateway.js';
export { generateHeuristicFix, applyFixToSource } from './fix/generate.js';
export { validateFix } from './fix/validate.js';
export { analyzeFile } from './analyze.js';
