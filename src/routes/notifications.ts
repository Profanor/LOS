import express from 'express';
import authenticateToken from '../middleware/auth';
import { handleNotifications } from '../controller/notificationController';
import { sendPushNotification } from '../fcm';

const router = express.Router();

router.post('/api/notifications', authenticateToken, handleNotifications);

// API endpoint for sending push notifications
router.post('/api/notifications/push', async (req, res) => {
    try {
      const { walletAddress, message } = req.body;
      
      // Send push notification to the player using FCM
      await sendPushNotification(walletAddress, message);
      res.json({ message: 'Push notification sent successfully' });
    } catch (error) {
      console.error('Error sending push notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;