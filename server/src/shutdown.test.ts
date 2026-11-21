import { describe, expect, it, vi } from 'vitest';

import { installSignalShutdown } from './shutdown.js';

describe('installSignalShutdown', () => {
  it('runs closeServer and cleanup once on SIGTERM', async () => {
    const closeServer = vi.fn().mockResolvedValue(undefined);
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();

    const dispose = installSignalShutdown({
      closeServer,
      cleanup,
      exit,
      forceExitMs: 5_000,
    });

    process.emit('SIGTERM');

    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledWith(0);
    });

    expect(closeServer).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();

    dispose();
  });
});
