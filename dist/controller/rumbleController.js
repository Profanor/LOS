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
exports.joinRumble = exports.createRumble = void 0;
const rumble_1 = __importDefault(require("../models/rumble"));
const player_1 = __importDefault(require("../models/player"));
const webSocketController_1 = require("./webSocketController"); // Import WebSocket server instance
const createRumble = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rumbleName, rumbleReward, owner } = req.body;
        // Check if the owner's wallet address or nickname exists in the database
        const existingOwner = yield player_1.default.findOne({ $or: [{ walletAddress: owner.walletAddress }, { nickname: owner.nickname }] });
        if (!existingOwner) {
            return res.status(404).json({ error: 'Owner not found' });
        }
        const rumble = new rumble_1.default({
            rumbleName,
            rumbleReward,
            owner: { walletAddress: owner.walletAddress, nickname: owner.nickname },
            participants: [{ walletAddress: owner.walletAddress, nickname: owner.nickname }]
        });
        yield rumble.save();
        // Send a WebSocket notification to owner indicating Royal Rumble match creation
        const notification = {
            type: 'rumble_creation',
            message: `You've successfully created the Royal Rumble match ${rumbleName}`,
            timestamp: Date.now()
        };
        webSocketController_1.wss.clients.forEach(client => {
            const ws = client;
            if (ws.readyState === WebSocket.OPEN && ws.walletAddress === owner.walletAddress) {
                ws.send(JSON.stringify(notification));
            }
        });
        res.json({ status: 'created' });
    }
    catch (error) {
        console.error('Error creating Royal Rumble match:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createRumble = createRumble;
const joinRumble = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rumbleName, teamOwner } = req.body;
        // Check if the rumblename and teamowner object exist
        if (!rumbleName || !teamOwner) {
            return res.status(400).json({ error: 'Invalid request: rumblename or teamowner does not exist' });
        }
        const rumble = yield rumble_1.default.findOne({ rumbleName });
        if (!rumble) {
            return res.status(404).json({ error: 'Royal Rumble match not found' });
        }
        // Check if the team owner exists in the database
        const owner = yield player_1.default.findOne({ walletAddress: teamOwner.walletAddress });
        if (!owner) {
            return res.status(404).json({ error: 'Team owner not found' });
        }
        // Ensure that the participants array is initialized
        if (!rumble.participants) {
            rumble.participants = [];
        }
        // Check if the team owner is already a participant
        const isAlreadyParticipant = rumble.participants.some(participant => participant.walletAddress === teamOwner.walletAddress);
        if (isAlreadyParticipant) {
            return res.status(400).json({ error: 'Team owner is already a participant in this Royal Rumble match' });
        }
        rumble.participants.push({ walletAddress: teamOwner.walletAddress, nickname: teamOwner.nickname });
        yield rumble.save();
        // Send a WebSocket notification to the match owner indicating a new participant
        const notification = {
            type: 'rumble_join',
            message: `${teamOwner.nickname} has joined your Royal Rumble match ${rumbleName}`,
            timestamp: Date.now()
        };
        // Perform a null check on owner.walletAddress before accessing it
        if (rumble.owner && rumble.owner.walletAddress) {
            webSocketController_1.wss.clients.forEach(client => {
                const ws = client;
                if (ws.readyState === WebSocket.OPEN && ws.walletAddress === owner.walletAddress) {
                    client.send(JSON.stringify(notification));
                }
            });
        }
        res.json({ message: 'Joined Royal Rumble match successfully' });
    }
    catch (error) {
        console.error('Error joining Royal Rumble match:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.joinRumble = joinRumble;
