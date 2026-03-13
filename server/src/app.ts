import express from 'express';
import matchRoutes from './routes/match.route.js';
import rawEventRoutes from './routes/rawEvent.route.js';
import rawEventAdminRoutes from './routes/rawEventAdmin.route.js';

const app = express();

app.use(express.json());

// routes

// app.use('/api', matchRoutes);
app.use('/api', rawEventRoutes);
app.use('/api', rawEventAdminRoutes);

export default app;

