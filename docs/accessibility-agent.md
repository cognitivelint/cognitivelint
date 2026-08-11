# CognitiveLint Accessibility Agent

AI-powered accessibility guidance for React developers inside VS Code and Cursor.

## What it does

```text
JSX / TSX
   ↓
eslint-plugin-jsx-a11y   ← deterministic "what is wrong?"
   ↓
Persona agents           ← human impact "why does it matter?"
   ↓
AI / heuristic fix       ← "how do I fix it?"
   ↓
Re-run jsx-a11y          ← validate before apply
```

### Personas

| Persona | Focus |
|---------|--------|
| 🔊 Screen Reader Agent | Accessible names, ARIA, headings, labels, announcements |
| ⌨ Keyboard Agent | Focus, click-only interactions, keyboard operability |
| 🧠 Cognitive Agent | Ambiguous labels, destructive clarity, cognitive burden |

## Packages

| Package | Role |
|---------|------|
| `@cognitivelint/a11y` | Analysis engine: jsx-a11y runner, semantic scan, personas, fix + validate |
| `@cognitivelint/a11y-server` | Language server (diagnostics + quick fixes) |
| `cognitivelint-a11y` | VS Code / Cursor extension |

## CLI

```bash
# Scan a React project
pnpm cognitivelint a11y

# Preview fixes
pnpm cognitivelint a11y --fix --dry-run

# Apply validated fixes
pnpm cognitivelint a11y --fix
```

## VS Code / Cursor

1. Build packages: `pnpm build`
2. Open `packages/vscode-a11y` with **Run Extension** (F5), or install the built extension
3. Open a `.jsx` / `.tsx` file
4. See inline diagnostics from personas
5. Use Quick Fix (`Ctrl+.` / `Cmd+.`) for:
   - Explain human impact
   - Generate accessibility fix
   - Explain WCAG guidance
   - Ask a specific persona
   - Ignore

Fixes always show a diff and validation summary before apply — never silent edits.

## Optional AI enrichment

Set `ANTHROPIC_API_KEY` (or `COGNITIVELINT_API_KEY`) to refine persona narratives and fix suggestions with Claude. Without a key, deterministic templates and heuristic fixes still work.

## MVP success loop

1. Open React project
2. Install / run CognitiveLint Accessibility
3. Open JSX/TSX
4. Receive diagnostics
5. Read human impact
6. Generate fix
7. Review diff + validation
8. Apply
