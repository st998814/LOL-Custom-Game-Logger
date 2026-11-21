/**
 * Isolate the unit-test process from host / production credentials.
 *
 * Prisma modules throw at import without DATABASE_URL; historically tests
 * required a dummy URL in the shell. This setup always injects a non-production
 * placeholder unless VITEST_ALLOW_DATABASE_URL=1 (integration / intentional).
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

if (process.env.VITEST_ALLOW_DATABASE_URL !== '1') {
  process.env.DATABASE_URL =
    'postgresql://vitest:vitest@127.0.0.1:5432/vitest_unit_unused';
}

process.env.REDIS_URL =
  process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Do not inherit production agent/admin secrets into the default unit suite.
// Individual auth tests set these explicitly in beforeEach.
if (process.env.VITEST_ALLOW_AUTH_ENV !== '1') {
  delete process.env.AGENT_API_KEY;
  delete process.env.ADMIN_API_TOKEN;
}
