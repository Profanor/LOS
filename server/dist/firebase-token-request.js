"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_1 = require("firebase/messaging");
const firebase_config_1 = require("./firebase-config");
// Function to request notification permissions and get the token
const requestPermissionAndGetToken = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Request permission to send notifications
        const permission = yield Notification.requestPermission();
        if (permission === 'granted') {
            // Get the registration token
            const currentToken = yield (0, messaging_1.getToken)(firebase_config_1.messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' });
            if (currentToken) {
                console.log('FCM registration token:', currentToken);
                // Send the token to your server or save it in the database
            }
            else {
                console.log('No registration token available.');
            }
        }
        else {
            console.log('Notification permission not granted');
        }
    }
    catch (err) {
        console.log('An error occurred while retrieving token. ', err);
    }
});
// Call the function when the app is ready or on a user action
requestPermissionAndGetToken();
