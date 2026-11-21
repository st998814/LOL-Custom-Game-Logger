import type { NextFunction, Request, Response } from 'express';

import { secureCompare } from '../security/compare.js';
import { getAgentApiKey, isProduction } from '../security/secrets.js';

const UNAUTHORIZED_BODY = {
  error: 'Unauthorized',
  code: 'UNAUTHORIZED',
} as const;

function requireAgentApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = getAgentApiKey();

  if (!expected) {
    if (isProduction()) {
      return res.status(401).json(UNAUTHORIZED_BODY);
    }
    // Local/dev convenience: unset key skips agent auth.
    return next();
  }

  const provided = req.header('X-Agent-Key') ?? '';
  if (!secureCompare(provided, expected)) {
    return res.status(401).json(UNAUTHORIZED_BODY);
  }

  return next();
}

export { requireAgentApiKey, UNAUTHORIZED_BODY };
