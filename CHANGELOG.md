# Changelog

## 0.1.0 (2024-07-17)

### Features

- Initial release of CognitiveLint
- **17 cognitive UX rules** across 6 categories:
  - Feedback: missing-loading-state, missing-empty-state, missing-success-feedback, no-progress-indicator
  - Trust & Confidence: unexplained-disabled, ownership-ambiguity, missing-ownership
  - Error Prevention: destructive-no-confirm, no-undo, modal-nesting, confirmation-fatigue
  - Cognitive Load: excessive-primary-actions, long-forms, filter-overload, dense-tables
  - Discoverability: missing-search, hidden-primary-action, empty-navigation
  - Consistency: inconsistent-button-labels
- **4 output formats**: Terminal (with colors), JSON, SARIF v2.1.0, HTML
- **Weighted scoring system** with letter grades (A-F)
- **CI/CD integration** with threshold-based exit codes
- **Configuration** via cosmiconfig (cognitivelint.config.js, .cognitivelintrc, etc.)

### Known Limitations

- `error-prevention/modal-nesting` may produce false positives with Radix UI, Headless UI, or PatternFly components. Disable with `rules: { 'error-prevention/modal-nesting': 'off' }` in config.
- AI explanations (`cognitivelint explain`) not yet implemented

### Performance

- Analyzes 1000+ React files in ~2 seconds
- Tested on real-world codebases (cal.com, migration-planner-ui)
