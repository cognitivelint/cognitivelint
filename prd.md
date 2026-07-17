# Product Requirements Document

# CognitiveLint

**Tagline:** SonarQube for Cognitive UX

---

# Vision

CognitiveLint helps engineering teams automatically detect cognitive friction in React applications before code reaches production.

Instead of measuring code quality, performance, or accessibility, CognitiveLint measures how much mental effort a user must spend to successfully complete a task.

The goal is to make cognitive UX measurable, actionable, and part of every CI pipeline.

---

# Problem Statement

Modern engineering teams have excellent tools for:

* Code quality (SonarQube)
* Performance (Lighthouse)
* Accessibility (axe)
* Security (Snyk)

However, there is no equivalent tool that answers questions like:

* Can users identify what belongs to them?
* Are permissions obvious?
* Is the UI creating unnecessary anxiety?
* Are users forced to remember information?
* Does the interface provide enough feedback?
* Is the workflow discoverable?

These issues are usually found late during UX reviews or after customer complaints.

---

# Product Vision

Developers should receive cognitive UX feedback in the same way they receive linting errors.

```
✓ Build Successful

Cognitive Score
78 / 100

Critical Issues
3

Recommendations
14

Estimated User Anxiety
Medium

Run:

npx cognitivelint explain
```

---

# Target Users

Primary

* Frontend Engineers
* Full-stack Engineers

Secondary

* UX Engineers
* Design System Teams
* Engineering Managers

Future

* Product Managers
* Design Teams
* QA Engineers

---

# Success Metrics

Within six months

* 500 GitHub stars
* 100 active repositories
* 50 organizations
* Average scan time under 30 seconds
* Under five false positives per scan

---

# MVP Scope

Framework

* React

Languages

* TypeScript
* JavaScript

Execution

* CLI
* GitHub Actions
* CI pipelines

Output

* Terminal
* HTML report
* SARIF
* JSON

---

# Core Architecture

```
React Project

↓

AST Parser

↓

Component Graph

↓

Route Graph

↓

State Analysis

↓

Rule Engine

↓

AI Explanation Layer

↓

Report
```

---

# Scoring Model

Overall Score

100 points

Categories

| Category           | Weight |
| ------------------ | ------ |
| Cognitive Load     | 30     |
| Trust & Confidence | 20     |
| Feedback           | 15     |
| Discoverability    | 15     |
| Consistency        | 10     |
| Error Prevention   | 10     |

Example

```
Overall
82

Cognitive Load
71

Trust
94

Feedback
66

Consistency
90
```

---

# Initial Rule Library

## Ownership

Detect

* Shared list without ownership indicator
* Missing "Created by"
* Owner exists in model but is never rendered
* Newly created object not highlighted

Severity

High

---

## Permission Uncertainty

Detect

* Disabled buttons without explanation
* Hidden actions caused by permissions
* Permission-dependent rendering without messaging

---

## Missing System Status

Detect

* Async mutation without spinner
* Async mutation without skeleton
* No success feedback
* No failure feedback

---

## Memory Burden

Detect

* Wizard without progress
* Hidden selected state
* Missing breadcrumbs
* Multi-step flow without persistence

---

## Recognition vs Recall

Detect

* IDs displayed instead of names
* Icons without labels
* Hidden ownership
* Ambiguous actions

---

## Decision Fatigue

Detect

* Too many primary buttons
* Large ungrouped forms
* Excessive filters
* Large menus

---

## Anxiety Patterns

Detect

* Delete without confirmation
* Destructive actions adjacent to safe actions
* Missing undo
* Missing autosave indicator

---

## Discoverability

Detect

* Lists without search
* Empty states without CTA
* No onboarding hints

---

## Information Density

Detect

* Tables wider than viewport
* More than twelve visible columns
* Dense card layouts

---

## Consistency

Detect

* Mixed button labels
* Mixed terminology
* Inconsistent icon usage

---

# Rule Output

Example

```
Rule

Ownership Ambiguity

Severity

High

Confidence

96%

Location

WorkflowList.tsx

Reason

Users cannot distinguish their own
work from organizational resources.

Recommendation

• Display owner avatar
• Replace username with "You"
• Highlight newly created item
• Default filter to Mine

Impact

Reduces uncertainty during task completion.
```

---

# AI Explanation Layer

Every rule includes

* Why it matters
* Cognitive psychology principle
* UX rationale
* Suggested implementation
* Example React code
* Before and after screenshots (future)

---

# CLI

```
npx cognitivelint scan

npx cognitivelint explain

npx cognitivelint report

npx cognitivelint fix
```

Future

```
npx cognitivelint coach
```

Interactive walkthrough of findings.

---

# CI Integration

GitHub Actions

```
- name: CognitiveLint
  run: npx cognitivelint scan
```

PR Comment

```
Cognitive Score

Previous
84

Current
76

Regression

Ownership Ambiguity introduced

Missing Loading Feedback

New

Permission Uncertainty

Recommendation

Review before merge.
```

---

# VS Code Extension

Features

* Inline warnings
* Hover explanations
* Rule documentation
* Quick fixes
* Live score

---

# Rule Engine

Each rule contains

* Metadata
* Detection logic
* Confidence score
* Severity
* Educational explanation
* Suggested fixes

Rules are extensible through plugins.

---

# Repository Structure

```
packages/

cli/

core/

parser-react/

rule-engine/

rules/

ownership/

feedback/

permissions/

discoverability/

consistency/

memory/

ai/

vscode/

github-action/

docs/
```

---

# Future Roadmap

Phase 1

* React
* CLI
* 20 rules
* CI support

Phase 2

* Next.js
* Storybook integration
* Playwright journey analysis
* Rule marketplace

Phase 3

* Angular
* Vue
* Svelte
* Design system integration

Phase 4

* AI-powered flow analysis
* Session replay integration
* Figma plugin
* Journey scoring
* Automatic UX pull request reviews

---

# Differentiation

| Tool          | Focus            |
| ------------- | ---------------- |
| ESLint        | Code correctness |
| SonarQube     | Code quality     |
| Lighthouse    | Performance      |
| axe           | Accessibility    |
| Snyk          | Security         |
| CognitiveLint | Cognitive UX     |

---

# North Star

Every pull request should answer one additional question before it is merged:

**"Did this change make the interface easier or harder for a human to understand?"**
