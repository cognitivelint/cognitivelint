# CognitiveLint

[![npm version](https://img.shields.io/npm/v/@dkoul/cognitivelint-cli.svg)](https://www.npmjs.com/package/@dkoul/cognitivelint-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Your code compiles. Does your UI make sense?**

*SonarQube for Cognitive UX* — static analysis that finds human bugs before your users do.

## What You Get

```
$ cognitivelint scan

  CognitiveLint v0.1.1

  Scanning 847 files...

  ┌──────────────────────────────────────────────────────────────────────┐
  │  Cognitive Score: 72/100 (C)                                         │
  │                                                                      │
  │  Cognitive Load     ████████░░  78%   Error Prevention  ███████░░░  68%  │
  │  Trust & Confidence ███████░░░  71%   Discoverability   ████████░░  76%  │
  │  Feedback           ██████░░░░  62%   Consistency       █████████░  88%  │
  └──────────────────────────────────────────────────────────────────────┘

  Human Bugs Found: 23

  src/components/UserTable.tsx
    ✗ 45:12  User may accidentally delete important data
             Destructive action has no confirmation step [destructive-no-confirm]

    ✗ 89:8   User cannot understand why this action is unavailable
             Disabled button offers no explanation [unexplained-disabled]

  src/pages/Checkout.tsx
    ✗ 112:4  User cannot see where they are in the process
             Multi-step flow has no progress indicator [no-progress-indicator]

    ✗ 156:8  System appears unresponsive during operation
             Async operation has no loading feedback [missing-loading-state]

  src/components/TeamDashboard.tsx
    ✗ 34:6   User cannot determine item ownership
             Shared list lacks owner attribution [ownership-ambiguity]
```

## Installation

```bash
npm install -g @dkoul/cognitivelint-cli

# Or run without installing
npx @dkoul/cognitivelint-cli scan
```

## Quick Start

```bash
# Scan your React project
cognitivelint scan

# Generate HTML report
cognitivelint scan -f html -o report.html

# CI mode - fail if score below threshold
cognitivelint scan --min-score 80
```

## Why This Exists

Tools exist for code quality (SonarQube), performance (Lighthouse), and accessibility (axe). But nothing measures **cognitive friction** — how much mental effort users spend completing tasks.

CognitiveLint finds human bugs: places where your UI compiles and runs but leaves users confused, anxious, or stuck.

## Human Bugs Detected

CognitiveLint finds **17 human bugs** across 6 cognitive categories:

### Feedback — "Is anything happening?"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| System appears unresponsive during operation | `missing-loading-state` | High |
| User sees no content but gets no explanation | `missing-empty-state` | Medium |
| User doesn't know if their action worked | `missing-success-feedback` | Medium |
| User cannot see where they are in the process | `no-progress-indicator` | Medium |

### Trust & Confidence — "Can I trust this?"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| User cannot understand why action is unavailable | `unexplained-disabled` | Medium |
| User cannot determine item ownership | `ownership-ambiguity` | Medium |
| User cannot verify who owns shared resources | `missing-ownership` | Low |

### Error Prevention — "What if I mess up?"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| User may accidentally destroy important data | `destructive-no-confirm` | Critical |
| User cannot recover from destructive action | `no-undo` | High |
| User gets trapped in nested modal hell | `modal-nesting` | High |
| User becomes desensitized to confirmations | `confirmation-fatigue` | Medium |

### Cognitive Load — "This is overwhelming"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| User cannot identify the primary action | `excessive-primary-actions` | Medium |
| User faces wall of form fields | `long-forms` | Medium |
| User drowns in filter options | `filter-overload` | Medium |
| User loses track in dense data tables | `dense-tables` | Medium |

### Discoverability — "How do I find this?"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| User cannot search large datasets | `missing-search` | Medium |
| User misses primary action below fold | `hidden-primary-action` | Medium |
| User clicks navigation that goes nowhere | `empty-navigation` | Medium |

### Consistency — "Why does this work differently?"
| Human Bug | Rule ID | Severity |
|-----------|---------|----------|
| User confused by mixed terminology | `inconsistent-button-labels` | Low |

## Scoring

CognitiveLint calculates a weighted score across cognitive categories:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| Cognitive Load | 30% | Mental effort required |
| Trust & Confidence | 20% | User certainty about actions |
| Feedback | 15% | System responsiveness |
| Discoverability | 15% | Feature findability |
| Consistency | 10% | Terminology uniformity |
| Error Prevention | 10% | Mistake avoidance |

**Grades**: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

## CLI Usage

```bash
# Basic scan with terminal output
cognitivelint scan

# Output as JSON
cognitivelint scan -f json

# Output as SARIF (for GitHub Code Scanning)
cognitivelint scan -f sarif -o report.sarif

# Generate HTML report
cognitivelint scan -f html -o report.html

# Fail if score below threshold (for CI)
cognitivelint scan --min-score 80

# Fail if too many human bugs
cognitivelint scan --max-findings 10
```

## Configuration

Create `cognitivelint.config.js` in your project root:

```javascript
export default {
  // Files to analyze
  include: ['src/**/*.tsx', 'src/**/*.jsx'],
  
  // Files to skip
  exclude: [
    '**/node_modules/**',
    '**/*.test.*',
    '**/*.stories.*',
    '**/components/ui/**',  // Skip UI component libraries
  ],
  
  // Rule configuration
  rules: {
    // Disable a rule
    'error-prevention/modal-nesting': 'off',
    
    // Adjust severity
    'feedback/missing-loading-state': { severity: 'critical' },
    
    // Configure options
    'cognitive-load/excessive-primary-actions': {
      severity: 'high',
      options: { maxPrimaryActions: 3 },
    },
  },
  
  // CI thresholds
  minScore: 70,
  maxFindings: 50,
};
```

### Disabling Rules for UI Libraries

If you're using Radix UI, Headless UI, or PatternFly, disable the `modal-nesting` rule which can produce false positives on component library patterns:

```javascript
export default {
  rules: {
    'error-prevention/modal-nesting': 'off',
  },
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Cognitive UX Check

on: [push, pull_request]

jobs:
  cognitivelint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run CognitiveLint
        run: npx @dkoul/cognitivelint-cli scan -f sarif -o cognitive.sarif --min-score 70
      
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: cognitive.sarif
```

### GitLab CI

```yaml
cognitivelint:
  stage: test
  script:
    - npx @dkoul/cognitivelint-cli scan --min-score 70 -f json -o cognitive-report.json
  artifacts:
    reports:
      codequality: cognitive-report.json
```

## Real-World Results

Tested on production codebases:

| Project | Files | Time | Score | Human Bugs |
|---------|-------|------|-------|------------|
| cal.com | 962 | 2.0s | 67 (D) | 140 |
| migration-planner-ui | 122 | 0.4s | 88 (B) | 33 |

## Development

```bash
# Clone the repo
git clone https://github.com/dkoul/cognitivelint.git
cd cognitivelint

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Test on a local project
node packages/cli/dist/index.js scan
```

## Packages

| Package | Description |
|---------|-------------|
| `@dkoul/cognitivelint-cli` | Command-line interface |
| `@dkoul/cognitivelint-core` | Core types and scoring algorithm |
| `@dkoul/cognitivelint-config` | Configuration loading (cosmiconfig) |
| `@dkoul/cognitivelint-parser-react` | React/JSX AST parsing |
| `@dkoul/cognitivelint-rule-engine` | Rule execution with visitor pattern |
| `@dkoul/cognitivelint-rules` | 17 built-in cognitive UX rules |
| `@dkoul/cognitivelint-formatters` | Terminal, JSON, SARIF, HTML output |
| `@dkoul/cognitivelint-ai` | AI explanation layer (coming soon) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new rules
4. Submit a pull request

## License

MIT
