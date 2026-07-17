# Trust & Confidence Rules

Rules that help users understand what will happen and who owns what.

**Weight**: 20% of total score

## Rules

### `trust-confidence/unexplained-disabled`

**Severity**: Medium

Disabled buttons should have explanatory tooltips so users understand why the action is unavailable and what they need to do to enable it.

#### Bad
```jsx
<button disabled onClick={handleSubmit}>Submit</button>
```

#### Good
```jsx
<Tooltip content="Complete all required fields to submit">
  <button disabled={!isValid} onClick={handleSubmit}>
    Submit
  </button>
</Tooltip>
```

Or use aria-describedby:
```jsx
<button 
  disabled={!isValid}
  aria-describedby="submit-help"
>
  Submit
</button>
<span id="submit-help" className="sr-only">
  Complete all required fields to submit
</span>
```

---

### `trust-confidence/ownership-ambiguity`

**Severity**: Medium

Shared data lists should indicate ownership so users can distinguish their items from others'.

#### Bad
```jsx
<TeamWorkspace>
  <DataList items={items}>
    {items.map(item => (
      <ListItem key={item.id}>
        {item.name}
      </ListItem>
    ))}
  </DataList>
</TeamWorkspace>
```

#### Good
```jsx
<TeamWorkspace>
  <DataList items={items}>
    {items.map(item => (
      <ListItem key={item.id}>
        <OwnerAvatar user={item.owner} />
        {item.name}
        {item.owner.id === currentUser.id && <Badge>Mine</Badge>}
      </ListItem>
    ))}
  </DataList>
</TeamWorkspace>
```

---

### `trust-confidence/missing-ownership`

**Severity**: Low

RBAC-protected data lists should display owner information so users understand who has access.

#### Bad
```jsx
<PermissionCheck permission="admin">
  <DataList items={items}>
    {items.map(item => <Item key={item.id} {...item} />)}
  </DataList>
</PermissionCheck>
```

#### Good
```jsx
<PermissionCheck permission="admin">
  <DataList items={items}>
    {items.map(item => (
      <Item key={item.id} {...item}>
        <OwnerBadge owner={item.createdBy} />
      </Item>
    ))}
  </DataList>
</PermissionCheck>
```
