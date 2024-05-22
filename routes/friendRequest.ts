import express from 'express';
import authenticateToken from '../middleware/auth';
import { sendFriendRequest, acceptFriendRequest, getSentFriendRequests, declineFriendRequest } from '../controller/playerController';

const router = express.Router();

router.post('/send', authenticateToken, sendFriendRequest);
router.post('/accept', authenticateToken, acceptFriendRequest);
router.get('/status', authenticateToken, getSentFriendRequests);
router.post('/decline', authenticateToken, declineFriendRequest);

export default router;
