import express from 'express';
import rawEventRoutes from './routes/rawEvent.route.js';
import rawEventAdminRoutes from './routes/rawEventAdmin.route.js';
import statsRoutes from './routes/stats.route.js';
import userRoutes from './routes/user.routes.js'

const app = express();

app.use(express.json());

// routes
app.use('/api', rawEventRoutes);
app.use('/api', rawEventAdminRoutes);
app.use('/api', statsRoutes);
app.use('/api/user', userRoutes);

export default app;
