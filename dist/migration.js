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
const uri = 'mongodb+srv://fivelanes72:w8bmemc07zFznh1x@cluster-los.lwlquoa.mongodb.net/';
const emptyFriendRequestNotifications = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(uri);
        const playersToUpdate = [
            { _id: '66672442449d5c7daf47f524', walletAddress: 'tobi' },
            { _id: '6667e202094128436174e16d', walletAddress: '0x1' }
        ];
        for (const player of playersToUpdate) {
            const foundPlayer = yield player_1.default.findById(player._id);
            if (foundPlayer) {
                // Empty friendRequestNotifications array using splice method
                foundPlayer.friendRequestNotifications.splice(0, foundPlayer.friendRequestNotifications.length);
                yield foundPlayer.save();
                console.log(`Emptied notifications for player: ${player.walletAddress}`);
            }
            else {
                console.log(`Player not found: ${player.walletAddress}`);
            }
        }
        console.log('Migration completed successfully');
    }
    catch (error) {
        console.error('Error during migration:', error);
    }
    finally {
        yield mongoose_1.default.connection.close();
    }
});
emptyFriendRequestNotifications();
