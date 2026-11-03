import express from 'express';
import {
  getAllTimeStatsController,
  getAverageStatsController,
  getChampionStatsController,
  getDateStatsController,
  getTopmostStatsController,
} from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/stats', getAllTimeStatsController);
router.get('/stats/average', getAverageStatsController);
router.get('/stats/topmost', getTopmostStatsController);
router.get('/stats/champion', getChampionStatsController);
router.get('/stats/date', getDateStatsController);

export default router;
