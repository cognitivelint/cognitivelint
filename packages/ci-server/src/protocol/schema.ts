import { z } from 'zod';

export const RUN_SCHEMA = 'cognitivelint.run.v1' as const;

const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

const categorySchema = z.enum([
  'cognitive-load',
  'trust-confidence',
  'feedback',
  'discoverability',
  'consistency',
  'error-prevention',
]);

const locationSchema = z.object({
  file: z.string(),
  startLine: z.number(),
  startColumn: z.number(),
  endLine: z.number(),
  endColumn: z.number(),
});

const findingSchema = z.object({
  ruleId: z.string().min(1),
  severity: severitySchema,
  confidence: z.number(),
  category: categorySchema,
  message: z.string(),
  location: locationSchema,
  context: z.record(z.string(), z.unknown()).optional(),
});

const reportSchema = z.object({
  tool: z.object({
    name: z.string(),
    version: z.string(),
  }),
  timestamp: z.string(),
  project: z.object({
    name: z.string(),
    path: z.string(),
  }),
  score: z.object({
    overall: z.number(),
    grade: z.enum(['A', 'B', 'C', 'D', 'F']),
    categories: z.array(
      z.object({
        category: categorySchema,
        score: z.number(),
        weight: z.number(),
        findingCount: z.number(),
      }),
    ),
  }),
  findings: z.array(findingSchema),
  summary: z.object({
    totalFindings: z.number(),
    bySeverity: z.record(z.number()),
    byCategory: z.record(z.number()),
    filesAnalyzed: z.number(),
    componentsAnalyzed: z.number(),
    scanDurationMs: z.number(),
  }),
  config: z.record(z.unknown()),
});

export const runV1Schema = z.object({
  schema: z.literal(RUN_SCHEMA),
  git: z.object({
    sha: z.string().min(1),
    branch: z.string().min(1),
    baseSha: z.string().min(1).optional(),
    prNumber: z.number().optional(),
  }),
  ci: z
    .object({
      provider: z.string().optional(),
      jobUrl: z.string().optional(),
    })
    .optional(),
  tool: z.object({
    name: z.string(),
    version: z.string(),
    rulesVersion: z.string().optional(),
  }),
  configHash: z.string().min(1),
  runKind: z.literal('cognitive'),
  report: reportSchema,
});

export type RunV1 = z.infer<typeof runV1Schema>;

export class ProtocolValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join('; '));
    this.name = 'ProtocolValidationError';
    this.issues = issues;
  }
}

export function parseRunV1(input: unknown): RunV1 {
  const result = runV1Schema.safeParse(input);
  if (!result.success) {
    throw new ProtocolValidationError(
      result.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`),
    );
  }
  return result.data;
}

export function parseProjectToken(token: string | undefined | null): string {
  const trimmed = token?.trim() ?? '';
  if (!trimmed) {
    throw new ProtocolValidationError(['project token must not be empty']);
  }
  return trimmed;
}
