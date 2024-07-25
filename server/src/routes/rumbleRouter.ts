import express from 'express';
import { createRumble, joinRumble } from '../controller/rumbleController';

const router = express.Router();

router.post('/api/rumble/create', createRumble);

router.post('/api/rumble/join', joinRumble);

export default router;