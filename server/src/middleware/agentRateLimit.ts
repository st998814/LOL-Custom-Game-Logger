import rateLimit from 'express-rate-limit';

type AgentRateLimitOptions = {
  windowMs?: number;
  max?: number;
};

/** Ingest: 30 req/min per IP (public agent path). */
function createIngestRateLimiter(options: AgentRateLimitOptions = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 60_000,
    max: options.max ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    // Single-EC2 / test clients may omit or spoof forwarding headers.
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  });
}

/** Status / link issue: 60 req/min per IP (public agent paths). */
function createAgentReadWriteRateLimiter(options: AgentRateLimitOptions = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 60_000,
    max: options.max ?? 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  });
}

const ingestRateLimiter = createIngestRateLimiter();
const agentReadWriteRateLimiter = createAgentReadWriteRateLimiter();

export {
  agentReadWriteRateLimiter,
  createAgentReadWriteRateLimiter,
  createIngestRateLimiter,
  ingestRateLimiter,
};
