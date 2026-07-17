# Error Prevention Rules

Rules that help users avoid mistakes and recover from errors.

**Weight**: 10% of total score

## Rules

### `error-prevention/destructive-no-confirm`

**Severity**: Critical

Destructive actions (delete, remove, destroy) should require confirmation to prevent accidental data loss.

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

**Severity**: High

Destructive actions should provide an undo capability when possible.

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

Modals should not be nested inside other modals. Nested modals confuse users about context and navigation.

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

**Note**: This rule may produce false positives with UI component libraries like Radix UI, Headless UI, or PatternFly. Disable it in your config if needed:

```javascript
// cognitivelint.config.js
export default {
  rules: {
    'error-prevention/modal-nesting': 'off',
  },
};
```

---

### `error-prevention/confirmation-fatigue`

**Severity**: Medium  
**Default threshold**: 2 confirmations per component

Too many confirmation dialogs train users to click through without reading, defeating their purpose.

#### Bad
```jsx
<ConfirmDialog action="save" />
<ConfirmDialog action="update" />
<ConfirmDialog action="publish" />
```

#### Good
Reserve confirmations for truly destructive or irreversible actions only.

#### Configuration
```javascript
{
  'error-prevention/confirmation-fatigue': {
    options: { maxConfirmations: 3 }
  }
}
```
