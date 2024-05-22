"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const playerSchema = new mongoose_1.default.Schema({
    nickname: {
        type: String,
        required: true,
        unique: true
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    battleLog: [{ type: String }],
    notification_BattleRequest: {
        isRead: {
            type: Boolean,
            default: false
        },
        challengers: [{
                nickname: { type: String },
                walletAddress: { type: String },
                timestamp: { type: Date }
            }],
        acceptedChallengers: [{
                nickname: { type: String },
                opponent: { type: String },
                battleScene: { type: String },
                opponentWallet: { type: String },
                walletAddress: { type: String }
            }]
    },
    battleMeta: {
        description: { type: String },
        id: { type: String },
        attributes: [{
                trait_type: { type: String },
                value: { type: String }
            }]
    },
    // Add registrationToken property
    registrationToken: {
        type: String,
        required: false
    },
    friendRequests: [{
            senderWallet: String,
            senderNickname: String,
            timestamp: Date,
            status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' }
        }],
    friendRequestNotifications: [{
            senderWallet: String,
            receiverWallet: String,
            status: { type: String, enum: ['Pending', 'Accepted', 'Declined'] },
            timestamp: { type: Date, default: Date.now }
        }],
    // Add reference to Friend model
    friends: [{ type: String, ref: 'Player' }],
});
const Player = mongoose_1.default.model('Player', playerSchema);
exports.default = Player;
