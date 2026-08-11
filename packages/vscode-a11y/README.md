# CognitiveLint Accessibility Agent

VS Code / Cursor extension that brings accessibility feedback into the editor while you write React JSX/TSX.

## Extension ID

```text
cognitivelint.cognitivelint-a11y
```

Verify install:

```bash
code --list-extensions | grep cognitivelint
# → cognitivelint.cognitivelint-a11y
```

There is **no** separate extension named `cognitivelint.cognitive`. That string was a chat-participant ID and must not be used as an agent/extension ID. Point any Cursor/VS Code agent config at `cognitivelint.cognitivelint-a11y`.

## Features

- Deterministic diagnostics via `eslint-plugin-jsx-a11y`
- Quick Fix menu: **Fix** · **Why?** · **Ignore**
- **Why?** combines human impact + WCAG
- Chat subagents (namespaced under the extension ID):
  - `@a11y-screen-reader`
  - `@a11y-keyboard`
  - `@a11y-cognitive`
- Fix preview with diff + jsx-a11y validation before apply
- Uses editor built-in models via `vscode.lm` (no separate API key)

## Install / reinstall

Extension ID: **`cognitivelint.cognitivelint-a11y`**

```bash
pnpm --filter cognitivelint-a11y package
code --install-extension packages/vscode-a11y/cognitivelint-a11y-0.1.1.vsix --force
```

Then **Developer: Reload Window**.

Quick Fix should show only: **Fix** · **Why?** · **Ignore**.

If you still see the old 7-item menu (Explain human impact / Ask Screen Reader / …), an old VSIX is still active — uninstall it first:

```bash
code --uninstall-extension cognitivelint.cognitivelint-a11y
code --install-extension packages/vscode-a11y/cognitivelint-a11y-0.1.1.vsix
```
