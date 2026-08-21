# @cognitivelint/cli

## 0.2.0

### Minor Changes

- [#4](https://github.com/cognitivelint/cognitivelint/pull/4) [`d7ff9f3`](https://github.com/cognitivelint/cognitivelint/commit/d7ff9f3c38da68ceb7bd5d012220f29fef0c3708) Thanks [@dkoul](https://github.com/dkoul)! - Add CognitiveLint Accessibility Agent MVP: jsx-a11y analysis, Screen Reader / Keyboard / Cognitive chat subagents via the editor's built-in vscode.lm models (no API keys), human-impact explanations, fix generation with validation, language server, and VS Code/Cursor extension.

### Patch Changes

- [#2](https://github.com/cognitivelint/cognitivelint/pull/2) [`62aa177`](https://github.com/cognitivelint/cognitivelint/commit/62aa177fe6c3dd7843a888cab74d4b9d6356d730) Thanks [@dkoul](https://github.com/dkoul)! - Relax default rule strictness to reduce false positives

  Raise cognitive-load thresholds, soften noisy severities, tighten destructive/filter/form heuristics, and disable modal-nesting by default.

- Updated dependencies [[`d7ff9f3`](https://github.com/cognitivelint/cognitivelint/commit/d7ff9f3c38da68ceb7bd5d012220f29fef0c3708), [`c9cd268`](https://github.com/cognitivelint/cognitivelint/commit/c9cd268110c9129b81e5fd4d8bc967bd0c7fda8f), [`4aab5d1`](https://github.com/cognitivelint/cognitivelint/commit/4aab5d1ea48b1873679613511203aa3490414f3b), [`62aa177`](https://github.com/cognitivelint/cognitivelint/commit/62aa177fe6c3dd7843a888cab74d4b9d6356d730), [`1259bd1`](https://github.com/cognitivelint/cognitivelint/commit/1259bd109788682189957fd369d1dd148a935635)]:
  - @cognitivelint/a11y@0.2.0
  - @cognitivelint/rules@0.2.0
  - @cognitivelint/core@0.1.2
  - @cognitivelint/config@0.1.2
  - @cognitivelint/formatters@0.1.2
  - @cognitivelint/parser-react@0.1.2
  - @cognitivelint/rule-engine@0.1.2
