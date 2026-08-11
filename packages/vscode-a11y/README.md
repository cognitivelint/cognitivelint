# CognitiveLint Accessibility Agent

VS Code / Cursor extension that brings accessibility feedback into the editor while you write React JSX/TSX.

## Features

- Deterministic diagnostics via `eslint-plugin-jsx-a11y`
- Quick Fix menu with three actions only: **Fix**, **Why?**, **Ignore**
- **Why?** combines human impact + WCAG in one explanation
- Chat **subagents** (`@screen-reader`, `@keyboard`, `@cognitive`) for deeper persona exploration via `vscode.lm`
- Fix preview with diff + jsx-a11y validation before apply
- **No separate Claude/OpenAI API key** — uses Copilot (VS Code) or Cursor agent models

## Development

From the monorepo root:

```bash
pnpm install
pnpm build
```

Then open this folder in VS Code/Cursor and run **Developer: Reload Window**, or launch an Extension Development Host pointing at `packages/vscode-a11y`.

The language server is resolved from `@cognitivelint/a11y-server`. On explain/fix, the server requests completions from the extension through `cognitivelint/editorLm/complete`.
