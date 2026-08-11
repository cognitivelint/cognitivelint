# CognitiveLint Accessibility Agent

VS Code / Cursor extension that brings accessibility feedback into the editor while you write React JSX/TSX.

## Features

- Deterministic diagnostics via `eslint-plugin-jsx-a11y`
- Human-impact explanations from Screen Reader, Keyboard, and Cognitive personas
- Quick Fix actions: explain, generate fix, WCAG guidance, ask a persona, ignore
- Fix preview with diff + jsx-a11y validation before apply

## Development

From the monorepo root:

```bash
pnpm install
pnpm build
```

Then open this folder in VS Code/Cursor and run **Developer: Reload Window**, or launch an Extension Development Host pointing at `packages/vscode-a11y`.

The language server is resolved from `@cognitivelint/a11y-server`.
