# CognitiveLint Accessibility Agent

AI-powered accessibility guidance for React developers inside VS Code and Cursor.

## What it does

```text
JSX / TSX
   ↓
eslint-plugin-jsx-a11y   ← deterministic "what is wrong?"
   ↓
Persona subagents        ← human impact "why does it matter?"
   ↓
Editor built-in LM       ← Copilot / Cursor agents via vscode.lm
   ↓
Fix + re-run jsx-a11y    ← validate before apply
```

### Personas (Chat subagents)

| Subagent | Chat handle | Focus |
|----------|-------------|--------|
| 🔊 Screen Reader Agent | `@screen-reader` | Accessible names, ARIA, headings, labels, announcements |
| ⌨ Keyboard Agent | `@keyboard` | Focus, click-only interactions, keyboard operability |
| 🧠 Cognitive Agent | `@cognitive` | Ambiguous labels, destructive clarity, cognitive burden |

These personas run as **editor chat participants**. They use the host’s built-in agent models through `vscode.lm` (GitHub Copilot in VS Code, Cursor models in Cursor). **No Anthropic/OpenAI API key is required.**

## Packages

| Package | Role |
|---------|------|
| `@cognitivelint/a11y` | Analysis engine: jsx-a11y runner, semantic scan, personas, fix + validate |
| `@cognitivelint/a11y-server` | Language server (diagnostics + quick fixes; asks the extension for LM) |
| `cognitivelint-a11y` | VS Code / Cursor extension + chat subagents |

## CLI

```bash
# Scan a React project (deterministic personas + heuristics)
pnpm cognitivelint a11y

# Preview fixes
pnpm cognitivelint a11y --fix --dry-run

# Apply validated fixes
pnpm cognitivelint a11y --fix
```

## VS Code / Cursor

1. Build packages: `pnpm build`
2. Open `packages/vscode-a11y` with **Run Extension** (F5), or install the built extension
3. Ensure Copilot (VS Code) or Cursor Agent models are available and signed in
4. Open a `.jsx` / `.tsx` file — see inline diagnostics
5. Use Quick Fix (`Ctrl+.` / `Cmd+.`) for explain / fix / WCAG / ask persona
6. Or open Chat and ask `@screen-reader`, `@keyboard`, or `@cognitive`

Fixes always show a diff and validation summary before apply — never silent edits.

Diagnostics stay fast and offline (templates). Live LM enrichment happens on demand through your editor’s agents.

## MVP success loop

1. Open React project
2. Install / run CognitiveLint Accessibility
3. Open JSX/TSX
4. Receive diagnostics
5. Read human impact (or ask a persona subagent in Chat)
6. Generate fix
7. Review diff + validation
8. Apply
