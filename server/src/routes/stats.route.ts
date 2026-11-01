import express from 'express';
import { getAllTimeStatsController } from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/stats', getAllTimeStatsController);

export default router;
