"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const royalRumbleSchema = new mongoose_1.default.Schema({
    rumbleName: {
        type: String,
        required: true,
        unique: true
    },
    rumbleReward: {
        type: Number,
        required: true
    },
    owner: {
        nickname: {
            type: String,
            required: true
        },
        walletAddress: {
            type: String,
            required: true
        }
    },
    participants: [{
            walletAddress: {
                type: String
            },
            nickname: {
                type: String
            }
        }]
});
const RoyalRumble = mongoose_1.default.model('RoyalRumble', royalRumbleSchema);
exports.default = RoyalRumble;
