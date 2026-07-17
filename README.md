# CognitiveLint

[![npm version](https://img.shields.io/npm/v/@dkoul/cognitivelint-cli.svg)](https://www.npmjs.com/package/@dkoul/cognitivelint-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SonarQube for Cognitive UX**

CognitiveLint automatically detects cognitive friction in React applications before code reaches production. While tools exist for code quality (SonarQube), performance (Lighthouse), and accessibility (axe), CognitiveLint fills the gap for measuring how much mental effort users must spend to complete tasks.

## Installation

```bash
# Install globally
npm install -g @dkoul/cognitivelint-cli

# Or use npx (no install required)
npx @dkoul/cognitivelint-cli scan
```

## Quick Start

```bash
# Scan your React project
cd your-react-project
cognitivelint scan

# Output as JSON
cognitivelint scan -f json

# Generate HTML report
cognitivelint scan -f html -o report.html

# CI mode - fail if score below threshold
cognitivelint scan --min-score 80
```

## What It Finds

CognitiveLint detects real UX issues:

```
src/components/UserTable.tsx
  ● 45:12   Destructive action lacks confirmation. Users may accidentally delete important data.
  ● 89:8    Disabled button has no explanation. Users cannot understand why this action is unavailable.
  ● 112:4   Multi-step flow lacks progress indicator. Users cannot see where they are in the process.
```

## Features

- **17 Cognitive UX Rules** across 6 categories
- **Fast**: Analyzes 1000+ files in ~2 seconds
- **Weighted Scoring**: 0-100 score with letter grades (A-F)
- **Multiple Output Formats**: Terminal, JSON, SARIF, HTML
- **CI/CD Ready**: Threshold-based exit codes for build gates
- **GitHub Integration**: SARIF output for Code Scanning

## Rules

### Feedback (4 rules)
| Rule | Severity | Description |
|------|----------|-------------|
| `feedback/missing-loading-state` | High | Async fetch without loading indicator |
| `feedback/missing-empty-state` | Medium | Data lists without empty state handling |
| `feedback/missing-success-feedback` | Medium | Mutations without success confirmation |
| `feedback/no-progress-indicator` | Medium | Multi-step flows without progress display |

### Trust & Confidence (3 rules)
| Rule | Severity | Description |
|------|----------|-------------|
| `trust-confidence/unexplained-disabled` | Medium | Disabled buttons without tooltips |
| `trust-confidence/ownership-ambiguity` | Medium | Shared lists without ownership indicators |
| `trust-confidence/missing-ownership` | Low | RBAC contexts without owner display |

### Error Prevention (4 rules)
| Rule | Severity | Description |
|------|----------|-------------|
| `error-prevention/destructive-no-confirm` | Critical | Delete actions without confirmation |
| `error-prevention/no-undo` | High | Destructive actions without undo capability |
| `error-prevention/modal-nesting` | High | Nested modals/dialogs |
| `error-prevention/confirmation-fatigue` | Medium | Too many confirmation dialogs |

### Cognitive Load (4 rules)
| Rule | Severity | Description |
|------|----------|-------------|
| `cognitive-load/excessive-primary-actions` | Medium | Too many primary buttons (>2) |
| `cognitive-load/long-forms` | Medium | Forms with >8 fields without grouping |
| `cognitive-load/filter-overload` | Medium | Too many filter options (>7) |
| `cognitive-load/dense-tables` | Medium | Tables with >10 columns |

### Discoverability (3 rules)
| Rule | Severity | Description |
|------|----------|-------------|
| `discoverability/missing-search` | Medium | Large paginated lists without search |
| `discoverability/hidden-primary-action` | Medium | Primary actions in scrollable containers |
| `discoverability/empty-navigation` | Medium | Navigation links with invalid destinations |

### Consistency (1 rule)
| Rule | Severity | Description |
|------|----------|-------------|
| `consistency/inconsistent-button-labels` | Low | Mixed terminology (Save/Submit/Apply) |

## Scoring

CognitiveLint calculates a weighted score across 6 cognitive categories:

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

# Fail if too many findings
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

If you're using Radix UI, Headless UI, or PatternFly, you may want to disable the `modal-nesting` rule which can produce false positives on component library patterns:

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

| Project | Files | Time | Score | Findings |
|---------|-------|------|-------|----------|
| cal.com | 962 | 2.0s | 67 (D) | 140 |
| migration-planner-ui | 122 | 0.4s | 88 (B) | 33 |

## Development

```bash
# Clone the repo
git clone https://github.com/your-org/cognitivelint.git
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
