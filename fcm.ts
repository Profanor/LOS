import admin from 'firebase-admin'; 
import Player from './models/player';

// Initialize Firebase Admin SDK with your service account credentials
const serviceAccount = require('./keys/project-los-df9ad-firebase-adminsdk-940qx-4825d6a052.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// Function to send push notification to a player using Firebase Cloud Messaging (FCM)
export const sendPushNotification = async (playerWalletAddress: string, message: string) => {
  try {
    // Find the player using the wallet address
    const player = await Player.findOne({ walletAddress: playerWalletAddress });
    if (!player) {
      console.error('Player not found');
      return;
    }

    const registrationToken = player.registrationToken;

    // Check if registrationToken is available
    if (!registrationToken) {
      console.error('Registration token not found for player:', playerWalletAddress);
      return;
    }

    // Define the payload for the push notification
    const payload = {
      notification: {
        title: 'New Notification',
        body: message,
      },
    };

     // Create the message object
     const fcmMessage: admin.messaging.Message = {
        notification: payload.notification,
        token: registrationToken,
      };

    // Send the push notification using Firebase Admin SDK
    await admin.messaging().send(fcmMessage);

    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
