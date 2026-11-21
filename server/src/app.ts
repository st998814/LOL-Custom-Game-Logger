import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import rawEventRoutes from './routes/rawEvent.route.js';
import rawEventAdminRoutes from './routes/rawEventAdmin.route.js';
import statsRoutes from './routes/stats.route.js';
import userRoutes from './routes/user.routes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const error = err as { type?: string; status?: number; statusCode?: number };
  if (
    error?.type === 'entity.too.large' ||
    error?.status === 413 ||
    error?.statusCode === 413
  ) {
    return res.status(413).json({
      error: 'Payload too large',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }
  return next(err);
});

// routes
app.use('/api', rawEventRoutes);
app.use('/api', rawEventAdminRoutes);
app.use('/api', statsRoutes);
app.use('/api/user', userRoutes);

export default app;
