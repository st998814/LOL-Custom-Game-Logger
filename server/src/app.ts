import express from 'express';
import matchRoutes from './routes/match.route.js';
import rawEventRoutes from './routes/rawEvent.route.js';
import rawEventAdminRoutes from './routes/rawEventAdmin.route.js';
import statsRoutes from './routes/stats.route.js';

const app = express();

app.use(express.json());

// routes

// app.use('/api', matchRoutes);
app.use('/api', rawEventRoutes);
app.use('/api', rawEventAdminRoutes);
app.use('/api', statsRoutes);

export default app;

