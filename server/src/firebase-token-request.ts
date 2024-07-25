import { getToken } from "firebase/messaging";
import { messaging } from './firebase-config';

// Function to request notification permissions and get the token
const requestPermissionAndGetToken = async () => {
  try {
    // Request permission to send notifications
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get the registration token
      const currentToken = await getToken(messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' });
      if (currentToken) {
        console.log('FCM registration token:', currentToken);
        // Send the token to your server or save it in the database
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Notification permission not granted');
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
  }
};

// Call the function when the app is ready or on a user action
requestPermissionAndGetToken();
