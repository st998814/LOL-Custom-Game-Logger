import express from 'express';
import { linkUserController } from '../controllers/user.controller.js';

const router = express.Router();

router.post('/register/link' , linkUserController);
// router.post('user/register/link/complete' , linkUserCompleteController);
export default router;