import express from 'express';
import receiveRawEventController from '../controllers/data.controller.js';

const router = express.Router();

// Lightweight ingestion endpoint – stores raw payloads only
router.post('/events', receiveRawEventController);

export default router;

