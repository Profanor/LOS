import express from 'express';
import authenticateToken from '../middleware/auth';

const router = express.Router();

import { sendPvpRequest, handlePvpAction } from '../controller/pvpController';

router.post('/api/pvp/request', authenticateToken, sendPvpRequest);
  
router.post('/api/pvp/action', authenticateToken, handlePvpAction);

export default router;