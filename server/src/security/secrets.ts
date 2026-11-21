type Env = NodeJS.ProcessEnv;

function readRequiredSecret(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/**
 * Fail-closed production boot: refuse to serve HTTP without auth secrets.
 * Local/dev (NODE_ENV !== 'production') may omit secrets for convenience.
 */
function assertProductionAuthEnv(env: Env = process.env): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const missing: string[] = [];
  if (!readRequiredSecret(env, 'AGENT_API_KEY')) {
    missing.push('AGENT_API_KEY');
  }
  if (!readRequiredSecret(env, 'ADMIN_API_TOKEN')) {
    missing.push('ADMIN_API_TOKEN');
  }

  if (missing.length > 0) {
    throw new Error(
      `Production auth is fail-closed: set ${missing.join(' and ')} when NODE_ENV=production`,
    );
  }
}

function getAgentApiKey(env: Env = process.env): string | null {
  return readRequiredSecret(env, 'AGENT_API_KEY');
}

function getAdminApiToken(env: Env = process.env): string | null {
  return readRequiredSecret(env, 'ADMIN_API_TOKEN');
}

function isProduction(env: Env = process.env): boolean {
  return env.NODE_ENV === 'production';
}

export {
  assertProductionAuthEnv,
  getAdminApiToken,
  getAgentApiKey,
  isProduction,
  readRequiredSecret,
};
