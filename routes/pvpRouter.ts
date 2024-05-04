import express from 'express';
const router = express.Router();

import { sendPvpRequest, handlePvpAction } from '../controller/pvpController';

router.post('/api/pvp/request', sendPvpRequest);
  
router.post('/api/pvp/action', handlePvpAction);

export default router;