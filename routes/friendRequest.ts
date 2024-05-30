import express from 'express';
import authenticateToken from '../middleware/auth';
import { sendFriendRequest, acceptFriendRequest, getSentFriendRequests, declineFriendRequest, unfriend, getFriendRequests } from '../controller/playerController';

const router = express.Router();

router.post('/send', authenticateToken, sendFriendRequest);
router.post('/accept', authenticateToken, acceptFriendRequest);
router.get('/status', authenticateToken, getSentFriendRequests);
router.get('/', authenticateToken, getFriendRequests);
router.post('/decline', authenticateToken, declineFriendRequest);
router.post('/unfriend', authenticateToken, unfriend);

export default router;
