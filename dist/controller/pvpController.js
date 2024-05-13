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
exports.deleteAcceptedChallenger = exports.handlePvpAction = exports.sendPvpRequest = void 0;
const webSocketController_1 = require("./webSocketController"); // Import WebSocket server instance
const player_1 = __importDefault(require("../models/player"));
const logger_1 = __importDefault(require("../logger"));
const sendPvpRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { sendersWallet, receiver } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_a = req.user) === null || _a === void 0 ? void 0 : _a.walletAddress;
        if (sendersWallet !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Validate input
        if (!sendersWallet && !receiver) {
            return res.status(400).json({ error: 'Either walletAddress or nickname is required' });
        }
        // Find sender
        let sender;
        if (sendersWallet) {
            sender = yield player_1.default.findOne({ walletAddress: sendersWallet });
            if (!sender) {
                return res.status(404).json({ error: 'Sender wallet address does not match any existing player' });
            }
        }
        let opponent;
        // Attempt to find the opponent using the walletAddress first
        if (receiver) {
            opponent = yield player_1.default.findOne({ $or: [{ walletAddress: receiver }, { nickname: receiver }] });
        }
        // If opponent not found using walletAddress, try finding using nickname
        if (!opponent && sendersWallet) {
            opponent = yield player_1.default.findOne({ walletAddress: sendersWallet });
        }
        if (!opponent) {
            return res.status(404).json({ error: 'Opponent not found' });
        }
        // Send a WebSocket notification to the opponent
        const notification = {
            type: 'pvp_request',
            sender: sender ? sender.walletAddress : null,
            opponent: opponent.walletAddress,
            message: `You have received a PVP request from ${sender === null || sender === void 0 ? void 0 : sender.nickname}`,
            timestamp: Date.now()
        };
        webSocketController_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.nickname === opponent.nickname) {
                client.send(JSON.stringify(notification));
            }
        });
        // Add the opponent's wallet address and nickname to the player's notification_BattleRequest.challengers array
        if (sender) {
            yield player_1.default.findOneAndUpdate({ walletAddress: opponent.walletAddress }, { $push: { 'notification_BattleRequest.challengers': { walletAddress: sender.walletAddress, nickname: sender.nickname, timestamp: Date.now() } } }, { new: true });
        }
        else {
            return res.status(404).json({ error: 'Sender not found' });
        }
        res.json({ message: 'PVP battle request sent successfully', sender: sender ? sender.walletAddress : null, opponent: opponent.walletAddress });
    }
    catch (error) {
        logger_1.default.error('Error sending PVP battle request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sendPvpRequest = sendPvpRequest;
const handlePvpAction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const { walletAddress, index, type } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_b = req.user) === null || _b === void 0 ? void 0 : _b.walletAddress;
        if (walletAddress !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Find the player
        const player = yield player_1.default.findOne({ walletAddress });
        // Check if player exists and has notification_BattleRequest
        if (!player || !player.notification_BattleRequest) {
            return res.status(404).json({ error: 'Player or notification_BattleRequest not found' });
        }
        // Handle the action based on the type (accept/decline/withdraw)
        switch (type) {
            case 'accept':
                // Check if the opponent's data needs to be updated in the sender's acceptedChallengers array
                if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                    const opponent = player.notification_BattleRequest.challengers[index];
                    const oneMinuteInSeconds = 60; // 1 minute in seconds
                    // Check if the request has expired (1 minute timeout)
                    const requestTimestamp = opponent.timestamp;
                    if (requestTimestamp) {
                        const currentTimeInSeconds = Math.floor(Date.now() / 1000); // Current time in seconds
                        const requestTimeInSeconds = Math.floor(requestTimestamp.getTime() / 1000); // Request time in seconds
                        const elapsedTimeInSeconds = currentTimeInSeconds - requestTimeInSeconds;
                        if (elapsedTimeInSeconds > oneMinuteInSeconds) {
                            console.log(`PvP battle request from ${opponent.walletAddress} has expired (${elapsedTimeInSeconds} seconds elapsed).`);
                            // Remove the expired request from the challenger's array
                            player.notification_BattleRequest.challengers.splice(index, 1);
                            yield player.save();
                            return res.status(400).json({ error: 'PvP battle request has expired' });
                        }
                    }
                    else {
                        return res.status(400).json({ error: 'Invalid timestamp for PvP battle request' });
                    }
                    // Find the sender and update their acceptedChallengers array
                    const sender = yield player_1.default.findOne({ walletAddress: opponent.walletAddress });
                    if (sender && sender.notification_BattleRequest) {
                        sender.notification_BattleRequest.acceptedChallengers.push({
                            walletAddress: player.walletAddress,
                            nickname: player.nickname
                        });
                        yield sender.save();
                    }
                }
                else {
                    return res.status(400).json({ error: 'Invalid index' });
                }
                // Remove the challenger from the receivers challengers array
                player.notification_BattleRequest.challengers.splice(index, 1);
                break;
            case 'decline':
                // Remove the challenger from challengers array
                if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                    player.notification_BattleRequest.challengers.splice(index, 1);
                }
                else {
                    return res.status(400).json({ error: 'Invalid index' });
                }
                break;
            case 'withdraw':
                // Remove the player from acceptedChallengers array
                if (player.notification_BattleRequest.acceptedChallengers && index < player.notification_BattleRequest.acceptedChallengers.length) {
                    player.notification_BattleRequest.acceptedChallengers.splice(index, 1);
                }
                else {
                    return res.status(400).json({ error: 'Invalid index' });
                }
                break;
            default:
                return res.status(400).json({ error: 'Invalid action type' });
        }
        yield player.save();
        res.json({ message: `PVP battle request ${type}ed successfully` });
    }
    catch (error) {
        logger_1.default.error('Error handling PVP battle request action:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.handlePvpAction = handlePvpAction;
const deleteAcceptedChallenger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const { walletAddress, index } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_c = req.user) === null || _c === void 0 ? void 0 : _c.walletAddress;
        if (walletAddress !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Find the player
        const player = yield player_1.default.findOne({ walletAddress });
        // Check if player exists and has acceptedChallengers array
        if (!player || !player.notification_BattleRequest || !player.notification_BattleRequest.acceptedChallengers) {
            return res.status(404).json({ error: 'Player or acceptedChallengers not found' });
        }
        // Check if the provided index is valid
        if (index < 0 || index >= player.notification_BattleRequest.acceptedChallengers.length) {
            return res.status(400).json({ error: 'Invalid index' });
        }
        // Remove the entry at the specified index
        player.notification_BattleRequest.acceptedChallengers.splice(index, 1);
        // Save the updated player document
        yield player.save();
        res.json({ message: 'Accepted challenger deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Error deleting accepted challenger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteAcceptedChallenger = deleteAcceptedChallenger;
