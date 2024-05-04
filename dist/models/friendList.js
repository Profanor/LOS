"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const friendListSchema = new mongoose_1.default.Schema({
    player: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' },
    friend: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' },
});
const FriendList = mongoose_1.default.model("Friend", friendListSchema);
exports.default = FriendList;
