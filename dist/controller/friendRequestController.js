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
exports.getFriendsList = exports.getFriendRequests = exports.unfriend = exports.sendFriendRequest = void 0;
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
        // Check if friend request already exists
        const pendingRequest = player.friendRequests.find(req => req.senderWallet === playersWallet && req.status === 'Pending');
        if (pendingRequest) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Friend request already pending' });
        }
        // Check if they are already friends
        const existingFriendship = player.friends.some(f => f === friend._id.toString()); // Corrected comparison
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
        friend.friendRequests.push({
            senderWallet: player.walletAddress,
            senderNickname: player.nickname,
            requestId: friendRequest.requestId,
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
//   export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const { receiverWallet, requestId } = req.body;
//       // Verify authorization
//       const tokenWalletAddress = req.user?.walletAddress;
//       if (receiverWallet !== tokenWalletAddress) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
//       }
//       // Find the friend request by ID
//       const friendRequest = await FriendList.findById(requestId).session(session);
//       if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({ error: 'Friend request not found' });
//       }
//       // Update the friend request status to 'Accepted'
//       friendRequest.status = 'Accepted';
//       await friendRequest.save({ session });
//       // Add each other to the friends list
//       const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
//       const sender = await Player.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
//       if (!receiver || !sender) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({ error: 'Player not found' });
//       }
//       receiver.friends.push(sender.walletAddress);
//       sender.friends.push(receiver.walletAddress);
//       // Remove the friend request from the sender's friendRequests list
//       // sender.friendRequests = sender.friendRequests.filter(req => {
//       //   return req._id && req._id.toString() !== requestId;
//       // }) as mongoose.Types.DocumentArray<{
//       //   status: "Pending" | "Accepted" | "Declined";
//       //   timestamp?: Date | null | undefined;
//       //   senderWallet?: string | null | undefined;
//       //   senderNickname?: string | null | undefined;
//       // }>;
//       // Remove the friend request from the receiver's friendRequests array
//       receiver.friendRequests = receiver.friendRequests.filter(req => {
//         return !(req.senderNickname === sender.nickname && req.status === 'Pending');
//       }) as mongoose.Types.DocumentArray<{
//         status: "Pending" | "Accepted" | "Declined";
//         timestamp?: Date | null | undefined;
//         senderWallet?: string | null | undefined;
//         senderNickname?: string | null | undefined;
//       }>;
//       // Add a friend request notification to the sender
//       sender.friendRequestNotifications.push({
//         receiverNickname: receiver.nickname,
//         status: 'Accepted',
//         timestamp: new Date()
//       });
//       await receiver.save({ session });
//       await sender.save({ session });
//       // Notify sender via websocket
//       const notification = {
//         type: 'friend_request_accepted',
//         receiver: receiver.walletAddress,
//         message: `${receiver.nickname} has accepted your friend request.`,
//         timestamp: Date.now()
//       };
//       wss.clients.forEach((client: WebSocketWithNickname) => {
//         if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
//           client.send(JSON.stringify(notification));
//         }
//       });
//       await session.commitTransaction();
//       session.endSession();
//       res.json({ message: 'Friend request accepted successfully' });
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       logger.error('Error accepting friend request:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };
//   export const declineFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const { receiverWallet, requestId } = req.body;
//       // Verify authorization
//       const tokenWalletAddress = req.user?.walletAddress;
//       if (receiverWallet !== tokenWalletAddress) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
//       }
//       // Find the friend request by ID
//       const friendRequest = await FriendList.findById(requestId).session(session);
//       if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({ error: 'Friend request not found' });
//       }
//       // Update the senders friend request status to 'Declined'
//       friendRequest.status = 'Declined';
//       await friendRequest.save({ session });
//       // find sender and receiver
//       const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
//       const sender = await Player.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
//       if (!receiver || !sender) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({ error: 'Player not found' });
//       }
//       // Remove the friend request from the receiver's friendRequests array
//       await Player.findOneAndUpdate(
//         { walletAddress: receiverWallet },
//         { $pull: { friendRequests: { requestId: friendRequest._id } } },
//         { session }
//       );
//       // Notify sender via websocket and save notification in sender's player document
//       const notification = {
//         type: 'friend_request_declined',
//         receiver: receiver.walletAddress,
//         message: `${receiver.nickname} has declined your friend request.`,
//         timestamp: Date.now()
//       };
//       sender.friendRequestNotifications.push({
//         receiverNickname: receiver.nickname,
//         status: 'Declined',
//         timestamp: new Date()
//       });
//       await sender.save({ session });
//       wss.clients.forEach((client: WebSocketWithNickname) => {
//         if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
//           client.send(JSON.stringify(notification));
//         }
//       });
//       await session.commitTransaction();
//       session.endSession();
//       res.json({ message: 'Friend request declined successfully' });
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       logger.error('Error declining friend request:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };
//Modified this endpoint to query the Player Schema instead of the friendList schema
const unfriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { friendWallet } = req.body;
        const walletAddress = (_c = req.user) === null || _c === void 0 ? void 0 : _c.walletAddress;
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
//   export const getSentFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const walletAddress = req.user?.walletAddress;
//       if (!walletAddress) {
//         return res.status(400).json({ error: 'Wallet address is required' });
//       }
//       // Find the player by wallet address
//       const player = await Player.findOne({ walletAddress });
//       if (!player) {
//         return res.status(404).json({ error: 'Player not found' });
//       }
//       // Fetch sent friend requests with their statuses
//       const sentRequests = await FriendList.find({ playerWallet: walletAddress });
//       // Fetch nicknames for each friendWallet
//       const friendWallets = sentRequests.map(request => request.friendWallet).filter((wallet): wallet is string => !!wallet);
//       const friends = await Player.find({ walletAddress: { $in: friendWallets } });
//       // Create a map of walletAddress to nickname
//       const nicknameMap: { [key: string]: string } = friends.reduce((map, friend) => {
//         map[friend.walletAddress] = friend.nickname;
//         return map;
//       }, {} as { [key: string]: string });
//       // Extract relevant information
//       const sentRequestsInfo = sentRequests.map(request => ({
//         friendWallet: request.friendWallet ?? 'Unknown',
//         nickname: request.friendWallet ? nicknameMap[request.friendWallet] || 'Unknown' : 'Unknown',
//         status: request.status,
//         timestamp: request.timestamp
//       }));
//       res.json({ sentRequests: sentRequestsInfo });
//     } catch (error) {
//       console.error('Error fetching sent friend requests:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };
//Does not reference the friendList Schema so safe for now
const getFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const walletAddress = (_d = req.user) === null || _d === void 0 ? void 0 : _d.walletAddress;
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
//Modified this endpoint to query the Player Schema directly instead of friendList schema
const getFriendsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        const walletAddress = (_e = req.user) === null || _e === void 0 ? void 0 : _e.walletAddress;
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
