import express from 'express';
import authenticateToken from '../middleware/auth';

const router = express.Router();

import { sendPvpRequest, handlePvpAction, deleteAcceptedChallenger } from '../controller/pvpController';

router.post('/api/pvp/request', authenticateToken, sendPvpRequest);
  
router.post('/api/pvp/action', authenticateToken, handlePvpAction);

router.post('/api/pvp/delete-accepted-challenger', authenticateToken, deleteAcceptedChallenger);

export default router;