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
code --uninstall-extension cognitivelint.cognitivelint-a11y
code --install-extension packages/vscode-a11y/cognitivelint-a11y-0.1.2.vsix
```

Then **Developer: Reload Window**.

Works in **VS Code and Cursor**. The language server is started with `TransportKind.ipc` (not Electron `process.execPath`), which is required for VS Code.

Quick Fix: **Fix** · **Why?** · **Ignore**.

If diagnostics are missing in VS Code, open **Output → CognitiveLint Accessibility** and confirm the server started.
