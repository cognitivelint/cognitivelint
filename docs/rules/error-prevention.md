# Error Prevention Rules

Rules that help users avoid mistakes and recover from errors.

**Weight**: 10% of total score

## Rules

### `error-prevention/destructive-no-confirm`

**Severity**: High

Destructive actions (delete, remove, destroy, discard) should require confirmation to prevent accidental data loss. Reversible UI actions like Clear/Reset are not flagged.

#### Bad
```jsx
<button onClick={() => deleteItem(id)}>Delete</button>
```

#### Good
```jsx
<button onClick={() => setShowConfirmDialog(true)}>Delete</button>
<ConfirmDialog
  open={showConfirmDialog}
  onConfirm={() => deleteItem(id)}
  message="Are you sure you want to delete this item?"
/>
```

---

### `error-prevention/no-undo`

**Severity**: Low

Destructive actions should provide an undo capability when possible. Actions that already require confirmation are not also flagged for missing undo.

#### Bad
```jsx
<button onClick={() => deleteItem(id)}>Delete</button>
```

#### Good
```jsx
<button onClick={() => {
  deleteItem(id);
  showUndo(() => restoreItem(id));
}}>Delete</button>
```

---

### `error-prevention/modal-nesting`

**Severity**: High  
**Default**: Off

Modals should not be nested inside other modals. Nested modals confuse users about context and navigation.

This rule is **disabled by default** because UI component libraries (Radix UI, Headless UI, PatternFly) often produce false positives. Enable it when you want nesting checks:

```javascript
// cognitivelint.config.js
export default {
  rules: {
    'error-prevention/modal-nesting': { severity: 'high' },
  },
};
```

#### Bad
```jsx
<Modal open={isOpen}>
  <Modal open={innerModalOpen}>
    <p>Nested modal content</p>
  </Modal>
</Modal>
```

#### Good
```jsx
<Modal open={isOpen}>
  <InlineForm />
</Modal>
```

---

### `error-prevention/confirmation-fatigue`

**Severity**: Medium  
**Default threshold**: 3 confirmations per component

Too many confirmation dialogs train users to click through without reading, defeating their purpose. Form `onConfirm` handlers are not counted.

#### Bad
```jsx
<ConfirmDialog action="save" />
<ConfirmDialog action="update" />
<ConfirmDialog action="publish" />
<ConfirmDialog action="archive" />
```

#### Good
Reserve confirmations for truly destructive or irreversible actions only.

#### Configuration
```javascript
{
  'error-prevention/confirmation-fatigue': {
    options: { maxConfirmations: 2 }
  }
}
```
