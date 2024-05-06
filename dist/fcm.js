"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const admin = __importStar(require("firebase-admin"));
const player_1 = __importDefault(require("./models/player"));
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
// Initialize Firebase Admin SDK with your service account credentials
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});
// Function to send push notification to a player using Firebase Cloud Messaging (FCM)
const sendPushNotification = (playerWalletAddress, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the player using the wallet address
        const player = yield player_1.default.findOne({ walletAddress: playerWalletAddress });
        if (!player) {
            logger.error('Player not found');
            return;
        }
        const registrationToken = player.registrationToken;
        // Check if registrationToken is available
        if (!registrationToken) {
            logger.error('Registration token not found for player:', playerWalletAddress);
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
        yield admin.messaging().send(fcmMessage);
        console.log('Push notification sent successfully');
    }
    catch (error) {
        logger.error('Error sending push notification:', error);
    }
});
exports.sendPushNotification = sendPushNotification;
