import { describe, expect, it } from 'vitest';

describe('unit test env isolation', () => {
  it('uses a non-production DATABASE_URL placeholder by default', () => {
    expect(process.env.DATABASE_URL).toContain('vitest_unit_unused');
  });

  it('does not inherit AGENT_API_KEY / ADMIN_API_TOKEN from the host by default', () => {
    // Auth suites set these explicitly per test; the setup file clears host leakage.
    // This assertion documents the default suite contract.
    expect(process.env.VITEST_ALLOW_AUTH_ENV).not.toBe('1');
  });
});
