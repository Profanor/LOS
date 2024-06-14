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
exports.getFriendsList = exports.getFriendRequests = exports.getSentFriendRequests = exports.unfriend = exports.declineFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const webSocketController_1 = require("./webSocketController");
const logger_1 = __importDefault(require("../logger"));
const mongoose_1 = __importDefault(require("mongoose"));
const player_1 = __importDefault(require("../models/player"));
const friendList_1 = __importDefault(require("../models/friendList"));
const sendFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { playersWallet, friendsNickname } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_a = req.user) === null || _a === void 0 ? void 0 : _a.walletAddress;
        if (playersWallet !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Check if both player and friend exist
        const player = yield player_1.default.findOne({ walletAddress: playersWallet }).session(session);
        const friend = yield player_1.default.findOne({ nickname: friendsNickname }).session(session);
        if (!player || !friend) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player or friend not found' });
        }
        // Check if there is a pending friend request
        const pendingRequest = yield friendList_1.default.findOne({
            playerWallet: playersWallet,
            friendWallet: friend.walletAddress,
            status: 'Pending'
        }).session(session);
        if (pendingRequest) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Friend request already pending' });
        }
        // Check if they are already friends
        const existingFriendship = yield friendList_1.default.findOne({
            $or: [
                { playerWallet: playersWallet, friendWallet: friend.walletAddress, status: 'Accepted' },
                { playerWallet: friend.walletAddress, friendWallet: playersWallet, status: 'Accepted' }
            ]
        }).session(session);
        if (existingFriendship) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'You are already friends' });
        }
        // Create friend request
        const friendRequest = new friendList_1.default({ playerWallet: playersWallet, friendWallet: friend.walletAddress, status: 'Pending' });
        yield friendRequest.save({ session });
        // Add the friend request to the receiver's friendRequests array
        friend.friendRequests.push({
            senderWallet: player.walletAddress,
            senderNickname: player.nickname,
            requestId: friendRequest._id,
            timestamp: new Date(),
            status: 'Pending'
        });
        yield friend.save({ session });
        // Notify receiver via websocket
        const notification = {
            type: 'friend_request',
            sender: player.walletAddress,
            message: `You have a new friend request from ${player.nickname}`,
            timestamp: Date.now()
        };
        webSocketController_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.nickname === friend.nickname) {
                client.send(JSON.stringify(notification));
            }
        });
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: 'Friend request sent successfully', requestId: friendRequest._id, status: friendRequest.status });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        logger_1.default.error('Error sending friend request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.sendFriendRequest = sendFriendRequest;
const acceptFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { receiverWallet, requestId } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_b = req.user) === null || _b === void 0 ? void 0 : _b.walletAddress;
        if (receiverWallet !== tokenWalletAddress) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Find the friend request by ID
        const friendRequest = yield friendList_1.default.findById(requestId).session(session);
        if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend request not found' });
        }
        // Update the friend request status to 'Accepted'
        friendRequest.status = 'Accepted';
        yield friendRequest.save({ session });
        // Add each other to the friends list
        const receiver = yield player_1.default.findOne({ walletAddress: receiverWallet }).session(session);
        const sender = yield player_1.default.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
        if (!receiver || !sender) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }
        receiver.friends.push(sender.walletAddress);
        sender.friends.push(receiver.walletAddress);
        // Remove the friend request from the sender's friendRequests list
        // sender.friendRequests = sender.friendRequests.filter(req => {
        //   return req._id && req._id.toString() !== requestId;
        // }) as mongoose.Types.DocumentArray<{
        //   status: "Pending" | "Accepted" | "Declined";
        //   timestamp?: Date | null | undefined;
        //   senderWallet?: string | null | undefined;
        //   senderNickname?: string | null | undefined;
        // }>;
        // Remove the friend request from the receiver's friendRequests array
        receiver.friendRequests = receiver.friendRequests.filter(req => {
            return !(req.senderNickname === sender.nickname && req.status === 'Pending');
        });
        // Add a friend request notification to the sender
        sender.friendRequestNotifications.push({
            receiverNickname: receiver.nickname,
            status: 'Accepted',
            timestamp: new Date()
        });
        yield receiver.save({ session });
        yield sender.save({ session });
        // Notify sender via websocket
        const notification = {
            type: 'friend_request_accepted',
            receiver: receiver.walletAddress,
            message: `${receiver.nickname} has accepted your friend request.`,
            timestamp: Date.now()
        };
        webSocketController_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
                client.send(JSON.stringify(notification));
            }
        });
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: 'Friend request accepted successfully' });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        logger_1.default.error('Error accepting friend request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.acceptFriendRequest = acceptFriendRequest;
const declineFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { receiverWallet, requestId } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_c = req.user) === null || _c === void 0 ? void 0 : _c.walletAddress;
        if (receiverWallet !== tokenWalletAddress) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Find the friend request by ID
        const friendRequest = yield friendList_1.default.findById(requestId).session(session);
        if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend request not found' });
        }
        // Update the senders friend request status to 'Declined'
        friendRequest.status = 'Declined';
        yield friendRequest.save({ session });
        // find sender and receiver
        const receiver = yield player_1.default.findOne({ walletAddress: receiverWallet }).session(session);
        const sender = yield player_1.default.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
        if (!receiver || !sender) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }
        // Remove the friend request from the receiver's friendRequests array
        yield player_1.default.findOneAndUpdate({ walletAddress: receiverWallet }, { $pull: { friendRequests: { requestId: friendRequest._id } } }, { session });
        // Notify sender via websocket and save notification in sender's player document
        const notification = {
            type: 'friend_request_declined',
            receiver: receiver.walletAddress,
            message: `${receiver.nickname} has declined your friend request.`,
            timestamp: Date.now()
        };
        sender.friendRequestNotifications.push({
            receiverNickname: receiver.nickname,
            status: 'Declined',
            timestamp: new Date()
        });
        yield sender.save({ session });
        webSocketController_1.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
                client.send(JSON.stringify(notification));
            }
        });
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: 'Friend request declined successfully' });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        logger_1.default.error('Error declining friend request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.declineFriendRequest = declineFriendRequest;
const unfriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { friendWallet } = req.body;
        const walletAddress = (_d = req.user) === null || _d === void 0 ? void 0 : _d.walletAddress;
        if (!walletAddress) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        const currentPlayer = yield player_1.default.findOne({ walletAddress }).session(session);
        if (!currentPlayer) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }
        const friendPlayer = yield player_1.default.findOne({ walletAddress: friendWallet }).session(session);
        if (!friendPlayer) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend not found' });
        }
        currentPlayer.friends = currentPlayer.friends.filter(friend => friend !== friendWallet);
        friendPlayer.friends = friendPlayer.friends.filter(friend => friend !== walletAddress);
        yield currentPlayer.save({ session });
        yield friendPlayer.save({ session });
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: 'You are no longer friends' });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error('Error unfriending:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.unfriend = unfriend;
const getSentFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        const walletAddress = (_e = req.user) === null || _e === void 0 ? void 0 : _e.walletAddress;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        // Find the player by wallet address
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Fetch sent friend requests with their statuses
        const sentRequests = yield friendList_1.default.find({ playerWallet: walletAddress });
        // Fetch nicknames for each friendWallet
        const friendWallets = sentRequests.map(request => request.friendWallet).filter((wallet) => !!wallet);
        const friends = yield player_1.default.find({ walletAddress: { $in: friendWallets } });
        // Create a map of walletAddress to nickname
        const nicknameMap = friends.reduce((map, friend) => {
            map[friend.walletAddress] = friend.nickname;
            return map;
        }, {});
        // Extract relevant information
        const sentRequestsInfo = sentRequests.map(request => {
            var _a;
            return ({
                friendWallet: (_a = request.friendWallet) !== null && _a !== void 0 ? _a : 'Unknown',
                nickname: request.friendWallet ? nicknameMap[request.friendWallet] || 'Unknown' : 'Unknown',
                status: request.status,
                timestamp: request.timestamp
            });
        });
        res.json({ sentRequests: sentRequestsInfo });
    }
    catch (error) {
        console.error('Error fetching sent friend requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSentFriendRequests = getSentFriendRequests;
const getFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        const walletAddress = (_f = req.user) === null || _f === void 0 ? void 0 : _f.walletAddress;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        // Find the player by wallet address
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Map over friendRequests and exclude the _id field
        const friendRequestsWithoutId = player.friendRequests.map(request => (Object.assign(Object.assign({}, request.toObject()), { _id: undefined // Explicitly exclude _id
         })));
        res.json({ friendRequests: friendRequestsWithoutId });
    }
    catch (error) {
        console.error('Error fetching friend requests list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFriendRequests = getFriendRequests;
const getFriendsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    try {
        const walletAddress = (_g = req.user) === null || _g === void 0 ? void 0 : _g.walletAddress;
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const friends = yield player_1.default.find({ walletAddress: { $in: player.friends } })
            .select('nickname walletAddress');
        res.json({ friendDetails: friends });
    }
    catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFriendsList = getFriendsList;
