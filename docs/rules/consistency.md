# Consistency Rules

Rules that ensure uniform terminology and patterns.

**Weight**: 10% of total score

**Principle**: Nielsen's Heuristic #4 - Consistency and Standards

## Rules

### `consistency/inconsistent-button-labels`

**Severity**: Low

Similar actions should use consistent terminology. Mixing "Save", "Submit", and "Apply" for the same type of action confuses users.

#### Bad
```jsx
<Form1>
  <button>Save</button>
</Form1>

<Form2>
  <button>Submit</button>
</Form2>

<Form3>
  <button>Apply</button>
</Form3>
```

#### Good
Pick one term and use it consistently:
```jsx
<Form1>
  <button>Save</button>
</Form1>

<Form2>
  <button>Save</button>
</Form2>

<Form3>
  <button>Save Changes</button>
</Form3>
```

### Detected Patterns

The rule detects inconsistencies in these action groups:

| Action Type | Variants Detected |
|-------------|-------------------|
| Save | save, submit, apply, update, confirm |
| Cancel | cancel, close, dismiss, back, nevermind |
| Delete | delete, remove, destroy, erase, trash |

### Note

This rule has low severity because terminology choices are often intentional based on context. Review findings to determine if consistency would improve UX.
