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
exports.handlePvpAction = exports.sendPvpRequest = void 0;
const webSocketController_1 = require("./webSocketController"); // Import WebSocket server instance
const player_1 = __importDefault(require("../models/player"));
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
const sendPvpRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sendersWallet, receiver } = req.body;
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
        logger.error('Error sending PVP battle request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sendPvpRequest = sendPvpRequest;
const handlePvpAction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { walletAddress, index, type } = req.body;
        // Find the player within a transaction
        const session = yield player_1.default.startSession();
        session.startTransaction();
        try {
            const player = yield player_1.default.findOne({ walletAddress }).session(session);
            if (!player || !player.notification_BattleRequest) {
                return res.status(404).json({ error: 'Player or notification_BattleRequest not found' });
            }
            switch (type) {
                case 'accept':
                    if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                        const opponent = player.notification_BattleRequest.challengers[index];
                        const oneMinuteInSeconds = 60;
                        const requestTimestamp = opponent.timestamp;
                        if (requestTimestamp) {
                            const currentTimeInSeconds = Math.floor(Date.now() / 1000);
                            const requestTimeInSeconds = Math.floor(requestTimestamp.getTime() / 1000);
                            const elapsedTimeInSeconds = currentTimeInSeconds - requestTimeInSeconds;
                            if (elapsedTimeInSeconds > oneMinuteInSeconds) {
                                console.log(`PvP battle request from ${opponent.walletAddress} has expired (${elapsedTimeInSeconds} seconds elapsed).`);
                                player.notification_BattleRequest.challengers.splice(index, 1);
                                yield player.save();
                                yield session.commitTransaction();
                                session.endSession();
                                return res.status(400).json({ error: 'PvP battle request has expired' });
                            }
                        }
                        else {
                            return res.status(400).json({ error: 'Invalid timestamp for PvP battle request' });
                        }
                        const sender = yield player_1.default.findOne({ walletAddress: opponent.walletAddress }).session(session);
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
                    break;
                case 'decline':
                    if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                        player.notification_BattleRequest.challengers.splice(index, 1);
                    }
                    else {
                        return res.status(400).json({ error: 'Invalid index' });
                    }
                    break;
                case 'withdraw':
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
            yield session.commitTransaction();
            session.endSession();
            res.json({ message: `PVP battle request ${type}ed successfully` });
        }
        catch (error) {
            yield session.abortTransaction();
            session.endSession();
            console.error('Error handling PVP battle request action:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    catch (error) {
        console.error('Error handling PVP battle request action:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.handlePvpAction = handlePvpAction;
