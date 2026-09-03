import express from 'express';
import { linkUserController , linkUserCompleteController } from '../controllers/user.controller.js';

const router = express.Router();

router.post('/register/link' , linkUserController);
router.post('/register/link/complete' , linkUserCompleteController);
export default router;