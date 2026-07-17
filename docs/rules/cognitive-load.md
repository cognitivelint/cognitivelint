# Cognitive Load Rules

Rules that reduce mental effort required to use the interface.

**Weight**: 30% of total score (highest weight)

**Principle**: Miller's Law - Humans can hold 7±2 items in working memory

## Rules

### `cognitive-load/excessive-primary-actions`

**Severity**: Medium  
**Default threshold**: 2 primary actions

Too many primary buttons compete for attention and make it unclear which action is most important.

#### Bad
```jsx
<div>
  <button className="btn-primary">Save</button>
  <button variant="primary">Submit</button>
  <button type="primary">Publish</button>
</div>
```

#### Good
```jsx
<div>
  <button className="btn-primary">Save</button>
  <button className="btn-secondary">Save as Draft</button>
  <button className="btn-link">Cancel</button>
</div>
```

#### Configuration
```javascript
{
  'cognitive-load/excessive-primary-actions': {
    options: { maxPrimaryActions: 3 }
  }
}
```

---

### `cognitive-load/long-forms`

**Severity**: Medium  
**Default threshold**: 8 fields

Forms with many fields should be grouped or split into steps to reduce cognitive overload.

#### Bad
```jsx
<form>
  <input name="firstName" />
  <input name="lastName" />
  <input name="email" />
  <input name="phone" />
  <input name="address1" />
  <input name="address2" />
  <input name="city" />
  <input name="state" />
  <input name="zip" />
  <input name="country" />
</form>
```

#### Good
```jsx
<form>
  <fieldset>
    <legend>Personal Information</legend>
    <input name="firstName" />
    <input name="lastName" />
    <input name="email" />
    <input name="phone" />
  </fieldset>
  <fieldset>
    <legend>Address</legend>
    <input name="address1" />
    <input name="address2" />
    <input name="city" />
    <input name="state" />
    <input name="zip" />
    <input name="country" />
  </fieldset>
</form>
```

#### Configuration
```javascript
{
  'cognitive-load/long-forms': {
    options: { maxFields: 10 }
  }
}
```

---

### `cognitive-load/filter-overload`

**Severity**: Medium  
**Default threshold**: 7 filters

Too many filter options overwhelm users. Consider progressive disclosure or saved filter presets.

#### Bad
```jsx
<FilterBar>
  <Filter name="status" />
  <Filter name="priority" />
  <Filter name="assignee" />
  <Filter name="date" />
  <Filter name="category" />
  <Filter name="tags" />
  <Filter name="project" />
  <Filter name="team" />
  <Filter name="milestone" />
</FilterBar>
```

#### Good
```jsx
<FilterBar>
  <Filter name="status" />
  <Filter name="priority" />
  <Filter name="assignee" />
  <MoreFiltersDropdown>
    <Filter name="date" />
    <Filter name="category" />
    <Filter name="tags" />
  </MoreFiltersDropdown>
</FilterBar>
```

---

### `cognitive-load/dense-tables`

**Severity**: Medium  
**Default threshold**: 10 columns

Tables with too many columns are hard to scan. Consider hiding less important columns or using expandable rows.

#### Bad
```jsx
<table>
  <thead>
    <tr>
      <th>ID</th><th>Name</th><th>Email</th><th>Phone</th>
      <th>Address</th><th>City</th><th>State</th><th>Zip</th>
      <th>Country</th><th>Created</th><th>Updated</th><th>Status</th>
    </tr>
  </thead>
</table>
```

#### Good
```jsx
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
</table>
// Use expandable rows or a detail panel for additional fields
```
