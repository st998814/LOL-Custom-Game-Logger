import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { requireAgentApiKey, UNAUTHORIZED_BODY } from './requireAgentApiKey.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_AGENT_API_KEY = process.env.AGENT_API_KEY;

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

  if (ORIGINAL_AGENT_API_KEY === undefined) delete process.env.AGENT_API_KEY;
  else process.env.AGENT_API_KEY = ORIGINAL_AGENT_API_KEY;
});

describe('requireAgentApiKey', () => {
  it('skips auth in non-production when AGENT_API_KEY is unset', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.AGENT_API_KEY;
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAgentApiKey({ header: () => undefined } as unknown as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects in production when AGENT_API_KEY is unset', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AGENT_API_KEY;
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAgentApiKey({ header: () => undefined } as unknown as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHORIZED_BODY);
  });

  it('rejects missing header when key is configured', () => {
    process.env.NODE_ENV = 'test';
    process.env.AGENT_API_KEY = 'expected-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAgentApiKey({ header: () => undefined } as unknown as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects invalid header when key is configured', () => {
    process.env.NODE_ENV = 'test';
    process.env.AGENT_API_KEY = 'expected-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAgentApiKey(
      { header: () => 'wrong-secret' } as unknown as Request,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts matching X-Agent-Key', () => {
    process.env.NODE_ENV = 'test';
    process.env.AGENT_API_KEY = 'expected-secret';
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    requireAgentApiKey(
      {
        header: (name: string) =>
          name === 'X-Agent-Key' ? 'expected-secret' : undefined,
      } as unknown as Request,
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
