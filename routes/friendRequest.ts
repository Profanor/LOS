import express from 'express';
import authenticateToken from '../middleware/auth';
import { sendFriendRequest, unfriend, getFriendRequests, getFriendsList } from '../controller/friendRequestController';

const router = express.Router();

router.get('/', authenticateToken, getFriendRequests);
router.post('/send', authenticateToken, sendFriendRequest);
// router.post('/accept', authenticateToken, acceptFriendRequest);
// router.get('/status', authenticateToken, getSentFriendRequests);
// router.post('/decline', authenticateToken, declineFriendRequest);
router.post('/unfriend', authenticateToken, unfriend);
router.get('/friends', authenticateToken, getFriendsList);

export default router;
