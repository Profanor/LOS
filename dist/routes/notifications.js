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
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controller/notificationController");
const fcm_1 = require("../fcm");
const router = express_1.default.Router();
router.post('/api/notifications', notificationController_1.handleNotifications);
// API endpoint for sending push notifications
router.post('/api/notifications/push', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { walletAddress, message } = req.body;
        // Send push notification to the player using FCM
        yield (0, fcm_1.sendPushNotification)(walletAddress, message);
        res.json({ message: 'Push notification sent successfully' });
    }
    catch (error) {
        console.error('Error sending push notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
