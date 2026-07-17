import type { Finding, CognitiveCategory, Severity } from './rule.js';

export interface CategoryScore {
  category: CognitiveCategory;
  score: number;
  weight: number;
  findingCount: number;
}

export interface CognitiveScore {
  overall: number;
  categories: CategoryScore[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface Summary {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<CognitiveCategory, number>;
  filesAnalyzed: number;
  componentsAnalyzed: number;
  scanDurationMs: number;
}

export interface Report {
  tool: {
    name: string;
    version: string;
  };
  timestamp: string;
  project: {
    name: string;
    path: string;
  };
  score: CognitiveScore;
  findings: Finding[];
  summary: Summary;
  config: Record<string, unknown>;
}
