import type { Severity, CognitiveCategory } from './rule.js';

export interface RuleConfig {
  severity?: Severity | 'off';
  options?: Record<string, unknown>;
}

export interface AIConfig {
  provider: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
}

export interface Config {
  include?: string[];
  exclude?: string[];
  rules?: Record<string, RuleConfig | 'off'>;
  weights?: Partial<Record<CognitiveCategory, number>>;
  minScore?: number;
  maxFindings?: number;
  format?: 'terminal' | 'json' | 'sarif' | 'html';
  aiExplanations?: boolean;
  ai?: AIConfig;
}

export const DEFAULT_WEIGHTS: Record<CognitiveCategory, number> = {
  'cognitive-load': 30,
  'trust-confidence': 20,
  'feedback': 15,
  'discoverability': 15,
  'consistency': 10,
  'error-prevention': 10,
};

export const DEFAULT_CONFIG: Config = {
  include: ['**/*.tsx', '**/*.jsx'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.stories.*',
    '**/packages/ui/**',
    '**/components/ui/**',
    '**/@radix-ui/**',
    '**/@headlessui/**',
  ],
  rules: {},
  weights: DEFAULT_WEIGHTS,
  format: 'terminal',
  aiExplanations: false,
};
