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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const player_1 = __importDefault(require("./models/player"));
// Initialize Firebase Admin SDK with your service account credentials
const serviceAccount = require('./keys/project-los-df9ad-firebase-adminsdk-940qx-4825d6a052.json');
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
});
// Function to send push notification to a player using Firebase Cloud Messaging (FCM)
const sendPushNotification = (playerWalletAddress, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the player using the wallet address
        const player = yield player_1.default.findOne({ walletAddress: playerWalletAddress });
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
        const fcmMessage = {
            notification: payload.notification,
            token: registrationToken,
        };
        // Send the push notification using Firebase Admin SDK
        yield firebase_admin_1.default.messaging().send(fcmMessage);
        console.log('Push notification sent successfully');
    }
    catch (error) {
        console.error('Error sending push notification:', error);
    }
});
exports.sendPushNotification = sendPushNotification;
