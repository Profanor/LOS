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
exports.getFriendsList = exports.getFriendRequests = exports.getFriendRequestStatus = exports.unfriend = exports.declineFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const webSocketController_1 = require("./webSocketController");
const logger_1 = __importDefault(require("../logger"));
const mongoose_1 = __importDefault(require("mongoose"));
const player_1 = __importDefault(require("../models/player"));
const sendFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { friendsNickname } = req.body;
        const playersWallet = (_a = req.user) === null || _a === void 0 ? void 0 : _a.walletAddress;
        // Verify authorization
        const tokenWalletAddress = (_b = req.user) === null || _b === void 0 ? void 0 : _b.walletAddress;
        if (playersWallet !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Find the current player sending the request
        const player = yield player_1.default.findOne({ walletAddress: playersWallet }).session(session);
        if (!player) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }
        // Find the friend receiving the request
        const friend = yield player_1.default.findOne({ nickname: friendsNickname }).session(session);
        if (!friend) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend not found' });
        }
        // Check if friend request already exists (from either side)
        const existingRequest = player.friendRequests.find(req => req.senderWallet === friend.walletAddress && req.status === 'Pending') ||
            friend.friendRequests.find(req => req.senderWallet === playersWallet && req.status === 'Pending');
        if (existingRequest) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Friend request already pending' });
        }
        // Check if they are already friends is fixed
        const existingFriendship = player.friends.includes(friend.walletAddress) ||
            friend.friends.includes(player.walletAddress);
        if (existingFriendship) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'You are already friends' });
        }
        // Create new friend request
        const friendRequest = {
            senderWallet: playersWallet,
            senderNickname: player.nickname,
            requestId: new mongoose_1.default.Types.ObjectId(),
            timestamp: new Date(),
            status: 'Pending'
        };
        // Add the friend request to the receiver's friendRequests array
        friend.friendRequests.push(friendRequest);
        yield friend.save({ session });
        // Add the friend request status to the friendNotifications array of the sender
        player.friendRequestNotifications.push({
            friendsNickname: friend.nickname,
            status: 'Pending',
            timestamp: new Date()
        });
        yield player.save({ session });
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
        res.json({ message: 'Friend request sent successfully', requestId: friendRequest.requestId, status: friendRequest.status });
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
        // Check if requestId is valid
        if (!requestId) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Invalid request ID' });
        }
        // Find the receiver player
        const receiver = yield player_1.default.findOne({ walletAddress: receiverWallet }).session(session);
        if (!receiver) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Receiver not found' });
        }
        // Find the friend request by ID
        const friendRequest = receiver.friendRequests.find(req => { var _a; return ((_a = req.requestId) === null || _a === void 0 ? void 0 : _a.toString()) === requestId; });
        if (!friendRequest || friendRequest.status !== 'Pending') {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend request not found' });
        }
        // Update the friend request status to 'Accepted'
        friendRequest.status = 'Accepted';
        // Add each other to the friends list
        const sender = yield player_1.default.findOne({ walletAddress: friendRequest.senderWallet }).session(session);
        if (!receiver || !sender) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }
        receiver.friends.push(sender.walletAddress);
        sender.friends.push(receiver.walletAddress);
        // Remove the friend request from the receiver's friendRequests array
        const requestIndex = receiver.friendRequests.findIndex(req => { var _a; return ((_a = req.requestId) === null || _a === void 0 ? void 0 : _a.toString()) === requestId; });
        if (requestIndex !== -1) {
            receiver.friendRequests.splice(requestIndex, 1);
        }
        // Save the updated receiver after removal
        yield receiver.save({ session });
        yield sender.save({ session });
        // Update the existing notification in the sender's friendRequestNotifications array
        const notificationIndex = sender.friendRequestNotifications.findIndex(notification => notification.friendsNickname === receiver.nickname && notification.status === 'Pending');
        if (notificationIndex !== -1) {
            sender.friendRequestNotifications[notificationIndex].status = 'Accepted';
            sender.friendRequestNotifications[notificationIndex].timestamp = new Date();
        }
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
    var _d;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { receiverWallet, requestId } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_d = req.user) === null || _d === void 0 ? void 0 : _d.walletAddress;
        if (receiverWallet !== tokenWalletAddress) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
        // Check if requestId is valid
        if (!requestId) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Invalid request ID' });
        }
        // Find the receiver player
        const receiver = yield player_1.default.findOne({ walletAddress: receiverWallet }).session(session);
        if (!receiver) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Receiver not found' });
        }
        // Find the friend request by ID
        const friendRequestIndex = receiver.friendRequests.findIndex(req => { var _a; return ((_a = req.requestId) === null || _a === void 0 ? void 0 : _a.toString()) === requestId; });
        if (friendRequestIndex === -1 || receiver.friendRequests[friendRequestIndex].status !== 'Pending') {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend request not found or not pending' });
        }
        // Remove the friend request from the receiver's friendRequests array
        const [friendRequest] = receiver.friendRequests.splice(friendRequestIndex, 1);
        // Update the receiver's document
        yield receiver.save({ session });
        // Find the sender
        const sender = yield player_1.default.findOne({ walletAddress: friendRequest.senderWallet }).session(session);
        if (!sender) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Sender not found' });
        }
        // Update the existing notification in the sender's friendRequestNotifications array to Declined
        const notificationIndex = sender.friendRequestNotifications.findIndex(notification => notification.friendsNickname === receiver.nickname && notification.status === 'Pending');
        if (notificationIndex !== -1) {
            sender.friendRequestNotifications[notificationIndex].status = 'Declined';
            sender.friendRequestNotifications[notificationIndex].timestamp = new Date();
        }
        yield sender.save({ session });
        // Notify sender via websocket and save notification in sender's player document
        const notification = {
            type: 'friend_request_declined',
            receiver: receiver.walletAddress,
            message: `${receiver.nickname} has declined your friend request.`,
            timestamp: Date.now()
        };
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
//Modified this endpoint to query the Player Schema instead of the friendList schema
const unfriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { friendWallet } = req.body;
        const walletAddress = (_e = req.user) === null || _e === void 0 ? void 0 : _e.walletAddress;
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
const getFriendRequestStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Extract relevant information from friendRequestNotifications
        const friendRequestStatuses = player.friendRequestNotifications.map(notification => ({
            status: notification.status,
            timestamp: notification.timestamp,
            statusId: notification._id,
            receiverNickname: notification.friendsNickname,
            receiverWallet: notification.receiverWallet,
        }));
        res.json({ Status: friendRequestStatuses });
    }
    catch (error) {
        console.error('Error fetching friend request statuses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getFriendRequestStatus = getFriendRequestStatus;
//Does not reference the friendList Schema so safe for now
const getFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    try {
        const walletAddress = (_g = req.user) === null || _g === void 0 ? void 0 : _g.walletAddress;
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
    var _h;
    try {
        const walletAddress = (_h = req.user) === null || _h === void 0 ? void 0 : _h.walletAddress;
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
