# CognitiveLint Rules

CognitiveLint includes 17 rules organized into 6 cognitive UX categories.

## Categories

| Category | Weight | Rules | Description |
|----------|--------|-------|-------------|
| [Cognitive Load](./cognitive-load.md) | 30% | 4 | Mental effort required to use the interface |
| [Trust & Confidence](./trust-confidence.md) | 20% | 3 | User certainty about what will happen |
| [Feedback](./feedback.md) | 15% | 4 | System responsiveness and status visibility |
| [Discoverability](./discoverability.md) | 15% | 3 | How easy features are to find |
| [Consistency](./consistency.md) | 10% | 1 | Terminology and pattern uniformity |
| [Error Prevention](./error-prevention.md) | 10% | 4 | Helping users avoid mistakes |

## Rule Configuration

Rules can be configured in `cognitivelint.config.js`:

```javascript
export default {
  rules: {
    // Disable a rule completely
    'error-prevention/modal-nesting': 'off',
    
    // Change severity
    'feedback/missing-loading-state': { severity: 'critical' },
    
    // Configure rule options
    'cognitive-load/long-forms': {
      severity: 'high',
      options: { maxFields: 10 },
    },
  },
};
```

## Severity Levels

| Severity | Score Impact | Description |
|----------|--------------|-------------|
| Critical | -15 points | Severe UX issue that blocks users |
| High | -10 points | Significant friction that frustrates users |
| Medium | -5 points | Noticeable issue that slows users down |
| Low | -2 points | Minor issue that slightly impacts experience |

## Writing Custom Rules

See the [Rule Development Guide](./development.md) for creating custom rules.
