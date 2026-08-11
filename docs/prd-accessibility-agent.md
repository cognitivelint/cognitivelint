# Product Requirements Document

# CognitiveLint Accessibility Agent

### AI-powered accessibility guidance for React developers

**MVP Platform:** VS Code + Cursor  
**Framework:** React  
**Language:** JSX / TSX  
**Deterministic engine:** `eslint-plugin-jsx-a11y`  
**AI layer:** Accessibility persona agents  
**Initial personas:** Screen Reader, Keyboard, Cognitive

---

# 1. Executive Summary

Accessibility is often discovered after software has already been built.

A developer writes a component, QA tests it, an accessibility audit identifies problems, defects are filed, and remediation happens in a later release.

For users like **James Walker**, a visually impaired developer, this can mean encountering inaccessible workflows and waiting through multiple releases before they become usable.

For developers like **Priya Nair**, the problem is different.

Priya wants to build accessible experiences, but she needs guidance **while she is writing the code**, not after the feature is complete.

Today, static accessibility tooling can identify many deterministic JSX problems. `eslint-plugin-jsx-a11y`, for example, performs static AST analysis of JSX and provides rules covering areas such as accessible names, ARIA attributes, keyboard interaction, focus, headings, labels, and media. Its own documentation notes that static analysis is only one part of a broader accessibility testing process.

CognitiveLint Accessibility Agent builds on this foundation.

It combines:

**Deterministic accessibility analysis + AI semantic reasoning + accessibility personas + human-impact explanations + AI-assisted remediation.**

The developer receives feedback directly inside VS Code or Cursor.

The goal is not simply to detect accessibility violations.

The goal is to help developers understand **how their code affects a human being**, fix the problem immediately, and gradually develop the instinct to build accessible interfaces by default.

---

# 2. Product Vision

> **Make accessibility feedback part of writing code, not a gate after code is written.**

CognitiveLint should become the accessibility reviewer sitting beside the developer.

Not an auditor.

Not a compliance dashboard.

A **development companion**.

---

# 3. Challenge

## Challenge 4: Accessibility in Software Development at Scale

### User story

**James Walker**, a developer who is visually impaired, tries to use a Red Hat product interface.

A key workflow does not work correctly with his screen reader.

He files feedback.

The problem takes multiple releases to resolve.

At the same time:

**Priya Nair**, a Red Hat engineer, wants to build accessible features.

She does not know in real time whether what she is writing will create an accessibility problem for users.

### Challenge

> **How might we ensure associates like Priya can build accessible experiences from the start, so users like James can fully engage with Red Hat products without barriers?**

---

# 4. Target Users

## Primary

Red Hat associates who build digital experiences:

- Software engineers
- Frontend developers
- Designers
- QA engineers
- Content designers

## Secondary

Users who rely on accessibility capabilities, including:

- Screen-reader users
- Keyboard-only users
- Users with cognitive accessibility needs

---

# 5. Problem Today

```text
Developer writes code
        ↓
Feature completed
        ↓
QA / accessibility review
        ↓
Accessibility issue discovered
        ↓
Defect created
        ↓
Prioritized against other work
        ↓
Fix implemented
        ↓
New release
        ↓
User finally benefits
```

This is expensive for the organization and frustrating for the user.

More importantly, it teaches developers the wrong lesson:

> Accessibility is something we check later.

---

# 6. Proposed Solution

CognitiveLint changes the development loop.

```text
Developer writes code
        ↓
CognitiveLint analyzes JSX
        ↓
jsx-a11y detects deterministic issues
        ↓
AI identifies semantic/contextual issues
        ↓
Accessibility persona explains human impact
        ↓
AI proposes fix
        ↓
Developer reviews/applies fix
        ↓
jsx-a11y validates
        ↓
Developer continues
```

The critical difference is **timing**.

Accessibility becomes feedback during creation rather than inspection after completion.

---

# 7. MVP Scope

The MVP deliberately focuses on a narrow technical surface.

### Framework

**React**

### Languages

**JSX / TSX**

### Editors

**VS Code**

**Cursor**

Cursor compatibility should be achieved through VS Code extension APIs wherever possible.

### Static analysis

**`eslint-plugin-jsx-a11y`**

The product should reuse its existing rules rather than recreate the deterministic accessibility rule engine.

### AI personas

1. 🔊 Screen Reader Agent
2. ⌨ Keyboard Agent
3. 🧠 Cognitive Accessibility Agent

### Initial component scope

Focus on common UI primitives:

- Buttons
- Links
- Images
- Forms
- Inputs
- Labels
- Headings
- Dialogs
- Menus
- Tabs
- Tables
- Alerts
- Status messages
- Error messages

---

# 8. Core Product Concept

The product has three layers.

## Layer 1: What is wrong?

Provided primarily by `eslint-plugin-jsx-a11y`.

Example:

```text
jsx-a11y/control-has-associated-label
```

This is the deterministic layer.

---

## Layer 2: Why does it matter?

Provided by the AI persona.

Example:

> 🔊 **Screen Reader Agent**
>
> This button has no accessible name.
>
> A screen-reader user may hear only "button" and cannot determine what action it performs.

This is the human-impact layer.

---

## Layer 3: How do I fix it?

Provided by AI-assisted remediation.

Example:

```diff
- <button onClick={deleteProject}>
-   <TrashIcon />
- </button>

+ <button onClick={deleteProject}>
+   <TrashIcon aria-hidden="true" />
+   <span className="sr-only">
+     Delete project
+   </span>
+ </button>
```

This is the remediation layer.

---

# 9. Persona Architecture

The personas are not separate models.

They are **specialized reasoning roles** operating over the same code and context.

```text
                    Accessibility Agent
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        Screen Reader    Keyboard       Cognitive
           Agent          Agent           Agent
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    Human Impact Model
                            │
                            ▼
                     Fix Recommendation
```

---

# 10. Persona 1: Screen Reader Agent

### Mission

Evaluate whether important information and interactions are understandable through screen-reader-oriented semantics.

### Initial detection areas

- Accessible names
- Image alternatives
- Button semantics
- Link semantics
- Heading hierarchy
- Form labels
- ARIA roles
- ARIA states
- Dialog semantics
- Dynamic content
- Status/error announcements

Many of these deterministic conditions can be surfaced by `eslint-plugin-jsx-a11y`; the AI layer adds contextual interpretation.

### Example

Code:

```jsx
<button onClick={deleteProject}>
  <TrashIcon />
</button>
```

AI feedback:

> 🔊 **Screen Reader Agent**
>
> **High human impact**
>
> I can reach this control, but I cannot determine what it does.
>
> A screen-reader user may hear only:
>
> **"button"**
>
> If several controls appear together, identifying the correct action becomes difficult.

---

# 11. Persona 2: Keyboard Agent

### Mission

Evaluate whether an interaction can be completed without a mouse.

### Initial detection areas

- Keyboard accessibility
- Focusability
- Focus order
- Interactive elements
- Click-only interactions
- Keyboard event handling
- Dialog focus
- Menu navigation
- Tab behavior

### Example

```jsx
<div onClick={openDialog}>
  Settings
</div>
```

Feedback:

> ⌨ **Keyboard Agent**
>
> This interaction depends on a mouse click.
>
> A keyboard-only user may not be able to reach or activate this control.
>
> Prefer a semantic interactive element such as `<button>`.

---

# 12. Persona 3: Cognitive Accessibility Agent

This is the persona that most clearly extends beyond conventional static accessibility linting.

### Mission

Identify unnecessary cognitive burden and ambiguity in accessible interactions.

### Initial detection areas

- Ambiguous labels
- Unclear actions
- Poor error messages
- Missing recovery instructions
- Inconsistent terminology
- Destructive actions
- Excessive memory requirements
- Unclear state changes
- Confusing instructions
- Missing confirmation for consequential actions

### Example

```jsx
<button>Delete</button>
```

If the page contains multiple deletable objects:

> 🧠 **Cognitive Agent**
>
> **Potential human impact**
>
> "Delete" does not identify what will be deleted.
>
> A user scanning the page must infer which object this action applies to.
>
> Consider:
>
> **"Delete project"**
>
> rather than:
>
> **"Delete"**

This may not be reducible to a single deterministic AST rule.

That is precisely where the AI layer provides value.

---

# 13. Human Impact Explanation

This is the product's central differentiator.

Every meaningful finding should attempt to answer:

### What happened?

> The button has no accessible name.

### Who is affected?

> Screen-reader users.

### What do they experience?

> The control may be announced only as "button."

### Why does it matter?

> The user cannot determine the action without additional exploration.

### What should I do?

> Provide a meaningful accessible name.

This creates the chain:

```text
Code
 ↓
Technical issue
 ↓
User
 ↓
Experience
 ↓
Consequence
 ↓
Fix
```

---

# 14. VS Code Experience

The MVP should live primarily inside the editor.

## Inline diagnostic

```text
⚠ Accessibility

Screen Reader Agent:
This button has no accessible name.

[Explain] [Fix]
```

The developer should not need to open a separate browser application.

---

# 15. Quick Fix Menu

When the developer invokes the VS Code quick-fix action:

```text
Accessibility

🔊 Explain human impact
✨ Generate accessibility fix
📖 Explain relevant WCAG guidance
🧠 Ask Cognitive Agent
⌨ Ask Keyboard Agent
🔊 Ask Screen Reader Agent
🚫 Ignore
```

The first three should be MVP.

Persona-specific actions can follow once the basic experience is stable.

---

# 16. AI Fix Generation

The AI should generate the **smallest safe change**.

Example:

```jsx
<button>
  <TrashIcon />
</button>
```

Possible fix:

```jsx
<button aria-label="Delete project">
  <TrashIcon aria-hidden="true" />
</button>
```

The AI must show the diff before applying it.

Never silently modify code.

---

# 17. Contextual Reasoning

The AI should have access to relevant local context.

For example:

```text
Current component
       +
Parent component
       +
Nearby JSX
       +
Props
       +
Imported components
       +
Existing accessibility patterns
```

This allows the AI to distinguish:

```jsx
<button>Delete</button>
```

from:

```jsx
<button>Delete project</button>
```

It may also identify that a generic label is ambiguous because multiple delete actions exist nearby.

---

# 18. Deterministic + AI Hybrid Architecture

This is a fundamental product requirement.

Do **not** replace `eslint-plugin-jsx-a11y`.

Use it.

```text
                JSX / TSX
                    │
                    ▼
             ESLint Engine
                    │
                    ▼
          eslint-plugin-jsx-a11y
                    │
          ┌─────────┴─────────┐
          │                   │
   Deterministic          No finding /
      finding             insufficient context
          │                   │
          └─────────┬─────────┘
                    ▼
              AI Reasoning
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        Screen    Keyboard   Cognitive
        Reader     Agent       Agent
          │         │         │
          └─────────┼─────────┘
                    ▼
             Human Impact
                    │
                    ▼
             AI Remediation
                    │
                    ▼
              Validation
```

---

# 19. AI Should Not Replace Rules

`eslint-plugin-jsx-a11y` is particularly useful because its rules are deterministic and transparent.

For example, it already provides rules for:

- `alt-text`
- `anchor-has-content`
- `control-has-associated-label`
- `aria-props`
- `aria-role`
- `click-events-have-key-events`
- `heading-has-content`
- `label-has-associated-control`
- `media-has-caption`
- `mouse-events-have-key-events`
- `no-autofocus`
- `no-static-element-interactions`
- `role-has-required-aria-props`
- `tabindex-no-positive`

and many others.

CognitiveLint should treat these as **trusted signals**.

AI adds reasoning around them.

---

# 20. AI Confidence

Every AI judgment should include confidence.

### High

```text
97% confidence

Safe to apply automatically.
```

### Medium

```text
78% confidence

Suggested remediation.
Developer review recommended.
```

### Low

```text
42% confidence

Potential accessibility concern.
Human review required.
```

The product must avoid false certainty.

---

# 21. Verification

AI-generated fixes must be validated.

```text
AI proposes fix
      ↓
Apply to temporary workspace
      ↓
Run jsx-a11y
      ↓
Check relevant rules
      ↓
Compare diagnostics
      ↓
Present result
```

Example:

```text
✨ Fix generated

✓ control-has-associated-label resolved
✓ No new jsx-a11y violations
✓ Existing behavior unchanged

Ready to apply.
```

---

# 22. The Learning Loop

The product should deliberately create a behavioral feedback loop.

```text
Developer writes code
        ↓
Finding
        ↓
Human impact explanation
        ↓
Developer understands
        ↓
Developer fixes
        ↓
Repeated exposure
        ↓
Mental model develops
        ↓
Better code next time
```

This produces a long-term hypothesis:

> **Repeated human-impact feedback will reduce recurring accessibility mistakes.**

The product therefore acts partly as an **accessibility learning system**.

---

# 23. MVP Metrics

## Product metrics

- Number of accessibility findings
- Time from finding to fix
- AI fix acceptance rate
- AI fix validation success rate
- Developer interaction rate
- False-positive rate

## Learning metrics

The most important experimental metric:

### Recurring accessibility mistakes per developer

Measure whether developers who receive human-impact feedback make fewer similar mistakes over time.

Example:

```text
Month 1
████████████████ 16 issues

Month 3
██████████       10 issues

Month 6
█████             5 issues
```

This would provide evidence for the product's deeper thesis.

---

# 24. MVP Success Criteria

The MVP is successful if a developer can:

1. Open a React project in VS Code/Cursor.
2. Install CognitiveLint.
3. Open a JSX/TSX file.
4. Receive accessibility diagnostics.
5. Understand the human impact.
6. Ask the AI for an explanation.
7. Generate a fix.
8. Review the diff.
9. Apply the fix.
10. Have the fix validated through deterministic accessibility rules.

The entire loop should take **seconds, not a ticket cycle**.

---

# 25. Out of Scope for MVP

Do not build these initially:

- Enterprise dashboard
- Product-wide accessibility score
- CI/CD platform
- Jira integration
- Organization-wide reporting
- Browser crawler
- Full WCAG auditing
- Automated screen-reader testing
- Automated visual accessibility testing
- All accessibility personas
- Design-tool integration
- Full accessibility compliance certification

These can come later.

---

# 26. MVP Technical Architecture

```text
VS Code / Cursor Extension
             │
             ▼
       Language Server
             │
             ▼
        ESLint Runner
             │
             ▼
   eslint-plugin-jsx-a11y
             │
             ▼
      Finding Normalizer
             │
             ▼
       Context Builder
             │
             ▼
        AI Gateway
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Screen  Keyboard Cognitive
    Reader   Agent    Agent
       │     │     │
       └─────┼─────┘
             ▼
     Human Impact Model
             │
             ▼
      Fix Generation
             │
             ▼
       Patch Preview
             │
             ▼
       Re-run Analysis
```

---

# 27. Example End-to-End Experience

Priya writes:

```jsx
<button onClick={deleteProject}>
  <TrashIcon />
</button>
```

CognitiveLint immediately reports:

---

### 🔊 Screen Reader Agent

**High impact**

This button does not expose an accessible name.

A screen-reader user may hear only **"button"** and cannot determine what action it performs.

**Recommended fix**

Provide a meaningful accessible name and hide the decorative icon from the accessibility tree.

**Confidence:** 97%

`[✨ Generate Fix]`

---

Priya clicks **Generate Fix**.

The extension presents:

```diff
<button onClick={deleteProject}>
-  <TrashIcon />
+  <TrashIcon aria-hidden="true" />
+  <span className="sr-only">Delete project</span>
</button>
```

Then:

```text
VALIDATING FIX

✓ Accessible name
✓ Decorative icon hidden
✓ jsx-a11y checks pass
✓ No additional violations introduced

[Apply Fix]
```

Priya clicks Apply.

The problem is gone before the code leaves her editor.

---

# 28. Competitive Positioning

The product should not claim to replace `eslint-plugin-jsx-a11y`.

Instead:

### `eslint-plugin-jsx-a11y`

> **Static accessibility rule engine**

### CognitiveLint Accessibility

> **AI accessibility reasoning and remediation layer for developers**

The relationship is complementary.

```text
jsx-a11y
"What is technically wrong?"

        +

CognitiveLint
"Why does it matter to a human?"

        +

AI Fix
"How can I safely fix it?"
```

That is the product.

---

# 29. Product Differentiator

The strongest differentiator is **human impact**.

Most developer tooling speaks in the language of code:

> Missing label.

CognitiveLint speaks in two languages:

> **Missing label.**

and:

> **A screen-reader user may not know what this control does.**

That second sentence is what changes behavior.

---

# 30. Long-Term Vision

The MVP begins as:

> **AI accessibility guidance inside VS Code and Cursor.**

It can eventually become:

```text
                COGNITIVELINT
                       │
             Human Experience Quality
                       │
          ┌────────────┴────────────┐
          │                         │
   Accessibility                Cognitive UX
          │                         │
   AI Personas                 UX Rules
          │                         │
          └────────────┬────────────┘
                       │
                AI Review Agents
                       │
              Explain + Fix + Verify
```

Accessibility becomes the first major application of the broader CognitiveLint philosophy:

> **Find the human bug before the human finds it.**

And the ultimate measure of success is not how many violations CognitiveLint reports.

It is whether, six months later, Priya writes:

```jsx
<button aria-label="Delete project">
```

**without CognitiveLint having to remind her.**

That is when accessibility has moved from **compliance to culture**.