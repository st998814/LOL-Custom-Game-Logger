import createMatchController  from '../controllers/match.controller.js';
import express from 'express';

const router = express.Router();

router.post('/match',createMatchController)


export default router;