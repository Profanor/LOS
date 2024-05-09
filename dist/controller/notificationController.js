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
exports.handleNotifications = void 0;
const player_1 = __importDefault(require("../models/player"));
const handleNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { walletAddress, campaign } = req.body;
        // Logic for different types of events
        let response;
        switch (campaign) {
            case 'PVP':
                response = yield handlePVPNotification(walletAddress);
                break;
            case 'TEAM':
                response = yield handleTeamNotification(walletAddress);
                break;
            case 'Royal Rumble':
                response = yield handleRumbleNotification(walletAddress);
                break;
            default:
                // Fallback to fetching all notifications if campaign type is not provided or invalid
                response = yield fetchAllNotifications(walletAddress);
                break;
        }
        res.json(response);
    }
    catch (error) {
        console.error('Error handling notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.handleNotifications = handleNotifications;
const fetchAllNotifications = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all notifications for the player
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return { error: 'Player not found' };
        }
        // Return all notifications
        return { notifications: player.notifications };
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return { error: 'Internal server error' };
    }
});
// Function to handle PVP notifications
const handlePVPNotification = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch PVP-related data from the database
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return { error: 'Player not found' };
        }
        // Check if notification_BattleRequest exists
        if (!player.notification_BattleRequest) {
            return { error: 'Notification_BattleRequest not found' };
        }
        // Extract data for PVP response
        const challengers = player.notification_BattleRequest.challengers;
        const acceptedChallengers = player.notification_BattleRequest.acceptedChallengers;
        const battleHistory = player.battleLog;
        return {
            challengers,
            acceptedChallengers,
            battleHistory
        };
    }
    catch (error) {
        console.error('Error handling PVP notification:', error);
        return { error: 'Internal server error' };
    }
});
// Function to handle Team notifications
const handleTeamNotification = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch Team-related data from the database
    const player = yield player_1.default.findOne({ walletAddress });
    if (!player) {
        return { error: 'Player not found' };
    }
    // Extract data for Team response
    const teams = [];
    const teamInvitations = [];
    const teamBattleInvitations = [];
    return {
        teams,
        teamInvitations,
        teamBattleInvitations
    };
});
// Function to handle Royal Rumble notifications
const handleRumbleNotification = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch Royal Rumble-related data from the database
    const player = yield player_1.default.findOne({ walletAddress });
    if (!player) {
        return { error: 'Player not found' };
    }
    // Extract data for Royal Rumble response
    const rumbleInvitations = [];
    return {
        rumbleInvitations
    };
});
