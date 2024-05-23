import express from 'express';
import authenticateToken from '../middleware/auth';
import { sendFriendRequest, acceptFriendRequest, getSentFriendRequests, declineFriendRequest, unfriend } from '../controller/playerController';

const router = express.Router();

router.post('/send', authenticateToken, sendFriendRequest);
router.post('/accept', authenticateToken, acceptFriendRequest);
router.get('/status', authenticateToken, getSentFriendRequests);
router.post('/decline', authenticateToken, declineFriendRequest);
router.post('/unfriend', authenticateToken, unfriend);

export default router;
