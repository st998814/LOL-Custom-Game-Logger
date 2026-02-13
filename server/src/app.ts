import express from 'express';
const app = express();
app.use(express.json());

// routes
import matchRoutes from './routes/match.route.js';

app.use('/api' , matchRoutes)



export default app;
