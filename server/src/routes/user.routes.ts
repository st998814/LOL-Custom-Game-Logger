import express from 'express';
import { linkUserController,linkUserCompleteController } from '../controllers/user.controller.js';

const router = express.Router();

router.post('user/register/link' , linkUserController);
router.post('user/register/link/complete' , linkUserCompleteController);
export default router;