import { describe, it, expect } from 'vitest';
import { emptyNavigation } from '../../src/discoverability/empty-navigation.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('discoverability/empty-navigation', () => {
  it('should flag nav link with href="#"', () => {
    const code = wrapInComponent(`
      <nav>
        <a href="#">Home</a>
        <a href="/about">About</a>
      </nav>
    `);
    const findings = runRule(emptyNavigation, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('discoverability/empty-navigation');
  });

  it('should flag nav link with empty href', () => {
    const code = wrapInComponent(`
      <nav>
        <a href="">Home</a>
      </nav>
    `);
    const findings = runRule(emptyNavigation, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag nav link with valid href', () => {
    const code = wrapInComponent(`
      <nav>
        <a href="/home">Home</a>
        <a href="/about">About</a>
      </nav>
    `);
    const findings = runRule(emptyNavigation, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag nav link with to prop (React Router)', () => {
    const code = wrapInComponent(`
      <nav>
        <Link to="/home">Home</Link>
        <NavLink to="/about">About</NavLink>
      </nav>
    `);
    const findings = runRule(emptyNavigation, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag links outside nav', () => {
    const code = wrapInComponent(`
      <div>
        <a href="#">Click here</a>
      </div>
    `);
    const findings = runRule(emptyNavigation, code);
    expect(findings.length).toBe(0);
  });
});
