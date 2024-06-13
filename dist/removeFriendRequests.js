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
function removeFriendRequests() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = 'mongodb+srv://fivelanes72:w8bmemc07zFznh1x@cluster-los.lwlquoa.mongodb.net/';
        if (!uri) {
            throw new Error("MongoDB URI is not defined in the environment variables");
        }
        yield mongoose_1.default.connect(uri);
        try {
            // Update the player document by pulling the specified friend requests
            yield player_1.default.updateOne({ _id: new mongoose_1.default.Types.ObjectId("6667e202094128436174e16d") }, { $pull: { friendRequests: { _id: { $in: [new mongoose_1.default.Types.ObjectId("66683aeb07d6eb16e406df08"), new mongoose_1.default.Types.ObjectId("6669a3f91bee538641502e03")] } } } });
            console.log('Friend requests removed successfully.');
        }
        catch (error) {
            console.error('Error removing friend requests:', error);
        }
        finally {
            mongoose_1.default.disconnect();
        }
    });
}
// Run the script
removeFriendRequests();
