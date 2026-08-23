import express from 'express';
import { registerUserController } from '../controllers/user.controller.js';

const router = express.Router();

router.post('user/register/initiate' , registerUserController);
router.post('user/register/link' , linkUserController);
export default router;