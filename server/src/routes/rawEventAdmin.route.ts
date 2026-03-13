import express from 'express';
import {
  getRawEventByIdController,
  replayRawEventController,
} from '../controllers/rawEventAdmin.controller.js';

const router = express.Router();

// NOTE: In a real system, protect these with authentication/authorization.
router.get('/admin/raw-events/:id', getRawEventByIdController);
router.post('/admin/raw-events/:id/replay', replayRawEventController);

export default router;

