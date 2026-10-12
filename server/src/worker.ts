import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { startRawEventProcessorLoop } = await import('./workers/rawEventProcessor.js');

async function main() {
  // eslint-disable-next-line no-console
  console.log('Starting RawEventProcessor worker...');

  await startRawEventProcessorLoop();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('RawEventProcessor worker crashed', error);
  process.exit(1);
});

