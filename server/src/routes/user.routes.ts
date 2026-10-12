import express from 'express';
import {
  completeLinkController,
  getAccountStatusController,
  requestLinkController,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/status', getAccountStatusController);
router.post('/link', requestLinkController);
router.post('/link/complete', completeLinkController);

// Deprecated: kept for capture agents and bots released before the rename.
router.post('/register/link', requestLinkController);
router.post('/register/link/complete', completeLinkController);

export default router;
