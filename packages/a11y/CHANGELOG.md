# @cognitivelint/a11y

## 0.2.0

### Minor Changes

- [#4](https://github.com/cognitivelint/cognitivelint/pull/4) [`d7ff9f3`](https://github.com/cognitivelint/cognitivelint/commit/d7ff9f3c38da68ceb7bd5d012220f29fef0c3708) Thanks [@dkoul](https://github.com/dkoul)! - Add CognitiveLint Accessibility Agent MVP: jsx-a11y analysis, Screen Reader / Keyboard / Cognitive chat subagents via the editor's built-in vscode.lm models (no API keys), human-impact explanations, fix generation with validation, language server, and VS Code/Cursor extension.

### Patch Changes

- [#11](https://github.com/cognitivelint/cognitivelint/pull/11) [`c9cd268`](https://github.com/cognitivelint/cognitivelint/commit/c9cd268110c9129b81e5fd4d8bc967bd0c7fda8f) Thanks [@dkoul](https://github.com/dkoul)! - Fix TSX accessibility detection by parsing with @typescript-eslint/parser so typed handlers (e.g. UploadTab drag/drop zones) still run jsx-a11y, and harden multiline click-only semantic matching plus Font Awesome icon-only buttons.

- [#10](https://github.com/cognitivelint/cognitivelint/pull/10) [`4aab5d1`](https://github.com/cognitivelint/cognitivelint/commit/4aab5d1ea48b1873679613511203aa3490414f3b) Thanks [@dkoul](https://github.com/dkoul)! - Fix VS Code showing no diagnostics despite server ready: push explicit analyze notifications for open editors, broaden JSX detection, and log finding counts to the Output channel. Ship 0.1.3 VSIX.

- [#6](https://github.com/cognitivelint/cognitivelint/pull/6) [`1259bd1`](https://github.com/cognitivelint/cognitivelint/commit/1259bd109788682189957fd369d1dd148a935635) Thanks [@dkoul](https://github.com/dkoul)! - Simplify accessibility Quick Fix menu to Fix, Why? (human impact + WCAG), and Ignore.
