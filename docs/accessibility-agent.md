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

All personas belong to extension ID **`cognitivelint.cognitivelint-a11y`** (not separate extensions).

| Subagent | Chat handle | Participant ID |
|----------|-------------|----------------|
| 🔊 Screen Reader Agent | `@a11y-screen-reader` | `cognitivelint.cognitivelint-a11y.screenReader` |
| ⌨ Keyboard Agent | `@a11y-keyboard` | `cognitivelint.cognitivelint-a11y.keyboard` |
| 🧠 Cognitive Agent | `@a11y-cognitive` | `cognitivelint.cognitivelint-a11y.cognitive` |

Do **not** configure agents as `cognitivelint.cognitive` — that ID is not an installed extension. Use `cognitivelint.cognitivelint-a11y`.

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
5. Use Quick Fix (`Ctrl+.` / `Cmd+.`) — only three actions:
   - **Fix** — generate a validated accessibility fix
   - **Why?** — human impact + WCAG in one explanation
   - **Ignore**
6. For deeper persona exploration, open Chat and ask `@a11y-screen-reader`, `@a11y-keyboard`, or `@a11y-cognitive`

Fixes always show a diff and validation summary before apply — never silent edits.

Diagnostics stay fast and offline (templates). Live LM enrichment happens on demand through your editor’s agents.

## MVP success loop

1. Open React project
2. Install / run CognitiveLint Accessibility
3. Open JSX/TSX
4. Receive diagnostics
5. Open Why? if you need the human impact + WCAG
6. Generate Fix, review diff + validation
7. Apply
