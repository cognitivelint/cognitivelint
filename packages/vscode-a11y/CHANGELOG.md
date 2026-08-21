# cognitivelint-a11y

## 0.1.5

### Patch Changes

- [#11](https://github.com/cognitivelint/cognitivelint/pull/11) [`c9cd268`](https://github.com/cognitivelint/cognitivelint/commit/c9cd268110c9129b81e5fd4d8bc967bd0c7fda8f) Thanks [@dkoul](https://github.com/dkoul)! - Fix TSX accessibility detection by parsing with @typescript-eslint/parser so typed handlers (e.g. UploadTab drag/drop zones) still run jsx-a11y, and harden multiline click-only semantic matching plus Font Awesome icon-only buttons.

- [#9](https://github.com/cognitivelint/cognitivelint/pull/9) [`e5adf82`](https://github.com/cognitivelint/cognitivelint/commit/e5adf826789fb1cf6ad32b1bc240e63ee00f48bd) Thanks [@dkoul](https://github.com/dkoul)! - Start the a11y language server with TransportKind.ipc so it works in VS Code (process.execPath is Electron there). Ship 0.1.2 VSIX.

- [#10](https://github.com/cognitivelint/cognitivelint/pull/10) [`4aab5d1`](https://github.com/cognitivelint/cognitivelint/commit/4aab5d1ea48b1873679613511203aa3490414f3b) Thanks [@dkoul](https://github.com/dkoul)! - Fix VS Code showing no diagnostics despite server ready: push explicit analyze notifications for open editors, broaden JSX detection, and log finding counts to the Output channel. Ship 0.1.3 VSIX.

- [#7](https://github.com/cognitivelint/cognitivelint/pull/7) [`88f1f0c`](https://github.com/cognitivelint/cognitivelint/commit/88f1f0c786470445512a9d7f40763a180ed96d5c) Thanks [@dkoul](https://github.com/dkoul)! - Align chat participant IDs under installed extension ID cognitivelint.cognitivelint-a11y so agent/runtime resolution no longer looks for cognitivelint.cognitive.

- [#8](https://github.com/cognitivelint/cognitivelint/pull/8) [`b8f2d6c`](https://github.com/cognitivelint/cognitivelint/commit/b8f2d6c77b39b2242031fc8c4dd5619efffce0ff) Thanks [@dkoul](https://github.com/dkoul)! - Restore accessibility diagnostics: fix LSP TextDocuments sync, remove broken server shebang packaging, and ship Fix/Why?/Ignore in a working 0.1.1 VSIX build.

- Updated dependencies [[`d7ff9f3`](https://github.com/cognitivelint/cognitivelint/commit/d7ff9f3c38da68ceb7bd5d012220f29fef0c3708), [`c9cd268`](https://github.com/cognitivelint/cognitivelint/commit/c9cd268110c9129b81e5fd4d8bc967bd0c7fda8f), [`e5adf82`](https://github.com/cognitivelint/cognitivelint/commit/e5adf826789fb1cf6ad32b1bc240e63ee00f48bd), [`4aab5d1`](https://github.com/cognitivelint/cognitivelint/commit/4aab5d1ea48b1873679613511203aa3490414f3b), [`b8f2d6c`](https://github.com/cognitivelint/cognitivelint/commit/b8f2d6c77b39b2242031fc8c4dd5619efffce0ff), [`1259bd1`](https://github.com/cognitivelint/cognitivelint/commit/1259bd109788682189957fd369d1dd148a935635)]:
  - @cognitivelint/a11y-server@0.2.0
