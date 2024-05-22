"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const friendListSchema = new mongoose_1.default.Schema({
    playerWallet: { type: String, ref: 'Player' },
    friendWallet: { type: String, ref: 'Player' },
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now }
});
const FriendList = mongoose_1.default.model("FriendList", friendListSchema);
exports.default = FriendList;
