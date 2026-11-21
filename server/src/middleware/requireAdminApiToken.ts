import type { NextFunction, Request, Response } from 'express';

import { secureCompare } from '../security/compare.js';
import { getAdminApiToken, isProduction } from '../security/secrets.js';

const UNAUTHORIZED_BODY = {
  error: 'Unauthorized',
  code: 'UNAUTHORIZED',
} as const;

function requireAdminApiToken(req: Request, res: Response, next: NextFunction) {
  const expected = getAdminApiToken();

  if (!expected) {
    if (isProduction()) {
      return res.status(401).json(UNAUTHORIZED_BODY);
    }
    // Local/dev: admin open only when token unset (still blocked publicly by Caddy).
    return next();
  }

  const provided = req.header('X-Admin-Token') ?? '';
  if (!secureCompare(provided, expected)) {
    return res.status(401).json(UNAUTHORIZED_BODY);
  }

  return next();
}

export { requireAdminApiToken, UNAUTHORIZED_BODY };
