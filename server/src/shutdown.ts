import type { Server } from 'node:http';

type ShutdownHooks = {
  closeServer?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  exit?: (code: number) => void;
  forceExitMs?: number;
};

/**
 * Registers SIGTERM/SIGINT handlers for graceful process exit.
 * Returns a disposer that removes the listeners (useful in tests).
 */
function installSignalShutdown(hooks: ShutdownHooks): () => void {
  let shuttingDown = false;
  const exit = hooks.exit ?? ((code: number) => process.exit(code));
  const forceExitMs = hooks.forceExitMs ?? 10_000;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}, shutting down...`);

    const forceTimer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('Forced shutdown after timeout');
      exit(1);
    }, forceExitMs);
    forceTimer.unref?.();

    try {
      if (hooks.closeServer) {
        await hooks.closeServer();
      }
      if (hooks.cleanup) {
        await hooks.cleanup();
      }
      exit(0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Shutdown failed', error);
      exit(1);
    } finally {
      clearTimeout(forceTimer);
    }
  }

  const onTerm = () => {
    void shutdown('SIGTERM');
  };
  const onInt = () => {
    void shutdown('SIGINT');
  };

  process.on('SIGTERM', onTerm);
  process.on('SIGINT', onInt);

  return () => {
    process.off('SIGTERM', onTerm);
    process.off('SIGINT', onInt);
  };
}

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export { closeHttpServer, installSignalShutdown };
