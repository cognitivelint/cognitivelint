# Feedback Rules

Rules that ensure users receive appropriate feedback about system status.

**Weight**: 15% of total score

**Principle**: Nielsen's Heuristic #1 - Visibility of System Status

## Rules

### `feedback/missing-loading-state`

**Severity**: High

User-triggered async operations should display loading feedback so users know their action is being processed.

#### Bad
```jsx
<button onClick={() => fetch('/api/save')}>Save</button>
```

#### Good
```jsx
const [isLoading, setIsLoading] = useState(false);

<button 
  onClick={async () => {
    setIsLoading(true);
    await fetch('/api/save');
    setIsLoading(false);
  }}
  disabled={isLoading}
>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

---

### `feedback/missing-empty-state`

**Severity**: Medium

Data lists should display an empty state when no data is available, not just show nothing.

#### Bad
```jsx
<DataList items={items}>
  {items.map(item => <Item key={item.id} {...item} />)}
</DataList>
```

#### Good
```jsx
{items.length === 0 ? (
  <EmptyState
    title="No items yet"
    description="Create your first item to get started"
    action={<Button>Create Item</Button>}
  />
) : (
  <DataList items={items}>
    {items.map(item => <Item key={item.id} {...item} />)}
  </DataList>
)}
```

---

### `feedback/missing-success-feedback`

**Severity**: Medium

Mutations (create, update, delete operations) should provide success feedback so users know their action completed.

#### Bad
```jsx
const mutation = useMutation();

<button onClick={() => mutation.mutate(data)}>Save</button>
```

#### Good
```jsx
const mutation = useMutation({
  onSuccess: () => toast.success('Changes saved!')
});

<button onClick={() => mutation.mutate(data)}>Save</button>
```

---

### `feedback/no-progress-indicator`

**Severity**: Medium

Multi-step flows (wizards, steppers) should display progress indicators so users know where they are in the process.

#### Bad
```jsx
<WizardStep step={currentStep}>
  <StepContent />
</WizardStep>
```

#### Good
```jsx
<div>
  <ProgressIndicator currentStep={currentStep} totalSteps={5} />
  <WizardStep step={currentStep}>
    <StepContent />
  </WizardStep>
</div>
```
