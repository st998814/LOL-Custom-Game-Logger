import createMatchController  from '../controllers/match.controller.js';
import express from 'express';

const router = express.Router();

router.post('/data',createMatchController)


export default router;