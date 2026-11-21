import express from 'express';
import {
  getRawEventByIdController,
  replayRawEventController,
} from '../controllers/rawEventAdmin.controller.js';
import { requireAdminApiToken } from '../middleware/requireAdminApiToken.js';

const router = express.Router();

router.get(
  '/admin/raw-events/:id',
  requireAdminApiToken,
  getRawEventByIdController,
);
router.post(
  '/admin/raw-events/:id/replay',
  requireAdminApiToken,
  replayRawEventController,
);

export default router;
