import express from 'express';
import {
  getAllTimeStatsController,
  getDetailedStatsController,
  getRecentStatsController,
} from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/stats', getAllTimeStatsController);
router.get('/stats/recent', getRecentStatsController);
router.get('/stats/details', getDetailedStatsController);

export default router;
