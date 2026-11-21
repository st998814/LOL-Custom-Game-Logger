import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { requireAdminApiToken, UNAUTHORIZED_BODY } from './requireAdminApiToken.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV;

  if (ORIGINAL_ADMIN_API_TOKEN === undefined) delete process.env.ADMIN_API_TOKEN;
  else process.env.ADMIN_API_TOKEN = ORIGINAL_ADMIN_API_TOKEN;
});

describe('requireAdminApiToken', () => {
  it('rejects missing token when ADMIN_API_TOKEN is configured', () => {
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_API_TOKEN = 'admin-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAdminApiToken({ header: () => undefined } as unknown as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHORIZED_BODY);
  });

  it('rejects invalid X-Admin-Token', () => {
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_API_TOKEN = 'admin-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAdminApiToken(
      { header: () => 'nope' } as unknown as Request,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts matching X-Admin-Token', () => {
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_API_TOKEN = 'admin-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAdminApiToken(
      {
        header: (name: string) =>
          name === 'X-Admin-Token' ? 'admin-secret' : undefined,
      } as unknown as Request,
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
