import { describe, it, expect } from 'vitest';
import { missingSearch } from '../../src/discoverability/missing-search.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('discoverability/missing-search', () => {
  it('should flag paginated data list without search', () => {
    const code = wrapInComponent(`
      <div>
        <DataList items={items}>
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </DataList>
        <Pagination page={1} total={100} />
      </div>
    `);
    const findings = runRule(missingSearch, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('discoverability/missing-search');
  });

  it('should flag paginated data table without search', () => {
    const code = wrapInComponent(`
      <div>
        <DataTable rows={data}>
          {rows.map(row => <tr key={row.id}><td>{row.name}</td></tr>)}
        </DataTable>
        <Pagination page={1} total={50} />
      </div>
    `);
    const findings = runRule(missingSearch, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag list with search input', () => {
    const code = wrapInComponent(`
      <div>
        <input type="search" placeholder="Search items..." />
        <ul className="item-list">
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </div>
    `);
    const findings = runRule(missingSearch, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag list with SearchBar component', () => {
    const code = wrapInComponent(`
      <div>
        <SearchBar onSearch={handleSearch} />
        <ul className="item-list">
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </div>
    `);
    const findings = runRule(missingSearch, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag list with filter functionality', () => {
    const code = wrapInComponent(`
      <div>
        <FilterInput onChange={handleFilter} />
        <ul className="item-list">
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </div>
    `);
    const findings = runRule(missingSearch, code);
    expect(findings.length).toBe(0);
  });
});
