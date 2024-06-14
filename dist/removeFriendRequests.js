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
const mongoose_1 = __importDefault(require("mongoose"));
const player_1 = __importDefault(require("./models/player"));
const friendList_1 = __importDefault(require("./models/friendList"));
const cleanupFriendList = () => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const players = yield player_1.default.find({}).session(session);
        for (const player of players) {
            const walletAddress = player.walletAddress;
            // Ensure all friendships in Player schema are in FriendList
            for (const friendWallet of player.friends) {
                const exists = yield friendList_1.default.findOne({
                    $or: [
                        { playerWallet: walletAddress, friendWallet: friendWallet },
                        { playerWallet: friendWallet, friendWallet: walletAddress }
                    ],
                    status: 'Accepted'
                }).session(session);
                if (!exists) {
                    // Create a missing FriendList entry
                    const newFriendListEntry = new friendList_1.default({
                        playerWallet: walletAddress,
                        friendWallet: friendWallet,
                        status: 'Accepted'
                    });
                    yield newFriendListEntry.save({ session });
                }
            }
            // Remove outdated FriendList entries
            yield friendList_1.default.deleteMany({
                $or: [
                    { playerWallet: walletAddress, status: 'Accepted', friendWallet: { $nin: player.friends } },
                    { friendWallet: walletAddress, status: 'Accepted', playerWallet: { $nin: player.friends } }
                ]
            }).session(session);
        }
        yield session.commitTransaction();
        session.endSession();
        console.log('Cleanup completed successfully');
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error('Error during cleanup:', error);
    }
});
cleanupFriendList();
