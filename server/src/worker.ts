import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { installSignalShutdown } from './shutdown.js';

const abort = new AbortController();

const { startRawEventProcessorLoop } = await import('./workers/rawEventProcessor.js');
const { disconnectPrisma } = await import('./db/prisma.js');

// eslint-disable-next-line no-console
console.log('Starting RawEventProcessor worker...');

const loopPromise = startRawEventProcessorLoop(abort.signal);

installSignalShutdown({
  closeServer: async () => {
    abort.abort();
    await loopPromise;
  },
  cleanup: async () => {
    await disconnectPrisma();
  },
});

try {
  await loopPromise;
  // eslint-disable-next-line no-console
  console.log('RawEventProcessor worker stopped');
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('RawEventProcessor worker crashed', error);
  process.exit(1);
}
