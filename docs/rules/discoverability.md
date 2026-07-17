# Discoverability Rules

Rules that ensure features are easy to find.

**Weight**: 15% of total score

**Principle**: Nielsen's Heuristic #6 - Recognition Rather Than Recall

## Rules

### `discoverability/missing-search`

**Severity**: Medium

Large paginated data lists should have search capability so users can quickly find items without paging through results.

#### Bad
```jsx
<div>
  <DataList items={items}>
    {items.map(item => <Item key={item.id} {...item} />)}
  </DataList>
  <Pagination page={page} total={100} />
</div>
```

#### Good
```jsx
<div>
  <SearchInput 
    placeholder="Search items..." 
    onChange={handleSearch} 
  />
  <DataList items={filteredItems}>
    {filteredItems.map(item => <Item key={item.id} {...item} />)}
  </DataList>
  <Pagination page={page} total={totalPages} />
</div>
```

---

### `discoverability/hidden-primary-action`

**Severity**: Medium

Primary actions should be visible without scrolling. Placing important buttons inside scrollable containers may cause users to miss them.

#### Bad
```jsx
<div style={{ overflow: 'auto', maxHeight: '400px' }}>
  <LongContent />
  <button className="btn-primary">Submit</button>
</div>
```

#### Good
```jsx
<div>
  <div style={{ overflow: 'auto', maxHeight: '400px' }}>
    <LongContent />
  </div>
  <div className="sticky-footer">
    <button className="btn-primary">Submit</button>
  </div>
</div>
```

---

### `discoverability/empty-navigation`

**Severity**: Medium

Navigation links should lead to valid destinations. Placeholder links (`href="#"`) confuse users.

#### Bad
```jsx
<nav>
  <a href="#">Dashboard</a>
  <a href="#">Settings</a>
  <a href="javascript:void(0)">Profile</a>
</nav>
```

#### Good
```jsx
<nav>
  <a href="/dashboard">Dashboard</a>
  <a href="/settings">Settings</a>
  <a href="/profile">Profile</a>
</nav>
```

Or for dynamic routes:
```jsx
<nav>
  <Link to={routes.dashboard}>Dashboard</Link>
  <Link to={routes.settings}>Settings</Link>
</nav>
```
