import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { assertProductionAuthEnv } from './security/secrets.js';
import { closeHttpServer, installSignalShutdown } from './shutdown.js';

assertProductionAuthEnv();

const { default: app } = await import('./app.js');
const { disconnectPrisma } = await import('./db/prisma.js');
const { disconnectRedis } = await import('./db/redis.js');

const PORT = 7871;

app.get('/', (_req, res) => {
  res.send('Server is up and running successfully!');
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

installSignalShutdown({
  closeServer: () => closeHttpServer(server),
  cleanup: async () => {
    await disconnectPrisma();
    await disconnectRedis();
  },
});
