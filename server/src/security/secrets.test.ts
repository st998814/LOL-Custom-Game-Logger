import { afterEach, describe, expect, it } from 'vitest';

import { assertProductionAuthEnv } from './secrets.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_AGENT_API_KEY = process.env.AGENT_API_KEY;
const ORIGINAL_ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV;

  if (ORIGINAL_AGENT_API_KEY === undefined) delete process.env.AGENT_API_KEY;
  else process.env.AGENT_API_KEY = ORIGINAL_AGENT_API_KEY;

  if (ORIGINAL_ADMIN_API_TOKEN === undefined) delete process.env.ADMIN_API_TOKEN;
  else process.env.ADMIN_API_TOKEN = ORIGINAL_ADMIN_API_TOKEN;
});

describe('assertProductionAuthEnv', () => {
  it('allows missing secrets outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AGENT_API_KEY;
    delete process.env.ADMIN_API_TOKEN;

    expect(() => assertProductionAuthEnv(process.env)).not.toThrow();
  });

  it('fails closed in production when AGENT_API_KEY is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AGENT_API_KEY;
    process.env.ADMIN_API_TOKEN = 'admin-secret';

    expect(() => assertProductionAuthEnv(process.env)).toThrow(/AGENT_API_KEY/);
  });

  it('fails closed in production when ADMIN_API_TOKEN is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.AGENT_API_KEY = 'agent-secret';
    delete process.env.ADMIN_API_TOKEN;

    expect(() => assertProductionAuthEnv(process.env)).toThrow(/ADMIN_API_TOKEN/);
  });

  it('passes in production when both secrets are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.AGENT_API_KEY = 'agent-secret';
    process.env.ADMIN_API_TOKEN = 'admin-secret';

    expect(() => assertProductionAuthEnv(process.env)).not.toThrow();
  });
});
