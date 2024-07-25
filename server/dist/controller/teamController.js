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
exports.declineInvite = exports.joinTeam = exports.createTeam = void 0;
const webSocketController_1 = require("./webSocketController"); // Import WebSocket server instance
const teams_1 = __importDefault(require("../models/teams"));
const createTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teamName, owner } = req.body;
        // Check if owner information is provided
        if (!owner || !owner.walletAddress || !owner.nickname) {
            return res.status(400).json({ error: 'Owner information missing' });
        }
        // Check if team already exists
        const existingTeam = yield teams_1.default.findOne({ teamName, owner });
        if (existingTeam) {
            return res.status(200).json({
                message: 'Your team exists already',
                Team: existingTeam
            });
        }
        ;
        // Check if team with the same name but different owner exists
        const teamWithSameName = yield teams_1.default.findOne({ teamName });
        if (teamWithSameName) {
            return res.status(409).json({
                error: 'Teamname already taken'
            });
        }
        ;
        const team = new teams_1.default({
            teamName,
            owner: {
                walletAddress: owner.walletAddress,
                nickname: owner.nickname
            },
            members: [{ walletAddress: owner.walletAddress, nickname: owner.nickname }]
        });
        yield team.save();
        // Send a WebSocket notification to owner indicating team creation
        const notification = {
            type: 'team_creation',
            message: `You've successfully created the team ${teamName}`,
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
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createTeam = createTeam;
const joinTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teamName, teamOwner } = req.body;
        const team = yield teams_1.default.findOne({ teamName });
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        // Ensure that the members array is initialized
        team.members = team.members || [];
        // Check if the player is already a member of the team
        const isAlreadyMember = team.members.some(member => member.walletAddress === teamOwner.walletAddress);
        if (isAlreadyMember) {
            return res.status(400).json({ error: 'Player is already a member of this team' });
        }
        team.members.push({ walletAddress: teamOwner.walletAddress, nickname: teamOwner.nickname });
        yield team.save();
        // Send a WebSocket notification to team owner indicating team join
        const notification = {
            type: 'team_join',
            message: `${teamOwner.nickname} has joined your team ${teamName}`,
            timestamp: Date.now()
        };
        webSocketController_1.wss.clients.forEach(client => {
            const ws = client;
            if (ws.readyState === WebSocket.OPEN && ws.walletAddress && ws.walletAddress === team.owner.walletAddress) {
                client.send(JSON.stringify(notification));
            }
        });
        res.json({ message: 'Joined team successfully' });
    }
    catch (error) {
        console.error('Error joining team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.joinTeam = joinTeam;
const declineInvite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teamName, walletAddress } = req.body;
        // remove the player's invitation from the specified team's invitation list
        const team = yield teams_1.default.findOne({ teamName });
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        // Ensure that the invitations array is initialized
        if (!team.invitations) {
            team.invitations = [];
        }
        team.invitations = team.invitations.filter(invitation => invitation.walletAddress !== walletAddress);
        yield team.save();
        res.json({ message: 'Declined team invite successfully' });
    }
    catch (error) {
        console.error('Error declining team invite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.declineInvite = declineInvite;
