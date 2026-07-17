import type { Finding, CognitiveCategory, Severity } from './types/rule.js';
import type { CognitiveScore, CategoryScore } from './types/report.js';
import { DEFAULT_WEIGHTS } from './types/config.js';

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function calculateScore(
  findings: Finding[],
  weights: Partial<Record<CognitiveCategory, number>> = DEFAULT_WEIGHTS
): CognitiveScore {
  const mergedWeights = { ...DEFAULT_WEIGHTS, ...weights };
  const findingsByCategory = groupBy(findings, (f) => f.category);

  const categoryScores: CategoryScore[] = (
    Object.entries(mergedWeights) as [CognitiveCategory, number][]
  ).map(([category, weight]) => {
    const categoryFindings = findingsByCategory[category] || [];
    const deductions = categoryFindings.reduce((total, finding) => {
      const base = SEVERITY_DEDUCTIONS[finding.severity];
      const confidenceMultiplier = finding.confidence / 100;
      return total + base * confidenceMultiplier;
    }, 0);

    const rawScore = 100 - deductions;
    const score = Math.max(0, Math.min(100, rawScore));

    return {
      category,
      score: Math.round(score),
      weight,
      findingCount: categoryFindings.length,
    };
  });

  const totalWeight = Object.values(mergedWeights).reduce((a, b) => a + b, 0);
  const overall = categoryScores.reduce(
    (total, cat) => total + (cat.score * cat.weight) / totalWeight,
    0
  );

  return {
    overall: Math.round(overall),
    categories: categoryScores,
    grade: getGrade(overall),
  };
}
