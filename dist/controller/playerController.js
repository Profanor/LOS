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
exports.logout = exports.getFriendRequests = exports.getSentFriendRequests = exports.unfriend = exports.declineFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = exports.getPlayerOnlineStatus = exports.searchForPlayer = exports.getBattleMeta = exports.switchCharacter = exports.signup = void 0;
const player_1 = __importDefault(require("../models/player"));
const friendList_1 = __importDefault(require("../models/friendList"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../logger"));
const webSocketController_1 = require("./webSocketController");
// Function to generate a random secret key
const generateSecretKey = () => {
    return crypto_1.default.randomBytes(32).toString('hex'); // Generate a 256-bit (32-byte) random string
};
// Generate a random secret key or use one from environment variables
const secretKey = process.env.SECRET_KEY || generateSecretKey();
//Function to generate JWT access token and refresh token based on the provided payload.
const generateTokens = (tokenPayload) => {
    const token = jsonwebtoken_1.default.sign(tokenPayload, secretKey, { expiresIn: '1h' });
    const refreshTokenPayload = { userId: tokenPayload.userId, walletAddress: tokenPayload.walletAddress, nickname: tokenPayload.nickname }; // Include walletAddress and nickname
    const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, secretKey, { expiresIn: '7d' });
    return { token, refreshToken };
};
// Function to generate alternative nicknames
const generateAlternativeNicknames = (nickname) => {
    const alternatives = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 5; i++) {
        let alternative = nickname;
        for (let j = 0; j < 3; j++) {
            alternative += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        alternatives.push(alternative);
    }
    return alternatives;
};
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress, nickname } = req.body;
    //check for empty input fields
    if (!nickname || !walletAddress || walletAddress.length < 2) {
        return res.status(400).json({ error: "walletaddress or nickname cannot be blank" });
    }
    // Validate nickname format
    const nicknameRegex = /^[a-zA-Z0-9]*$/;
    if (!nickname.match(nicknameRegex)) {
        return res.status(400).json({ error: 'Invalid nickname format' });
    }
    try {
        // Check if player with same nickname and wallet address exists
        const existingPlayer = yield player_1.default.findOne({ nickname, walletAddress });
        if (existingPlayer) {
            // Player already exists, update isOnline status to true
            yield player_1.default.updateOne({ _id: existingPlayer._id }, { $set: { isOnline: true } });
            // If player exists, generate JWT token and send it back to the client
            const userId = existingPlayer._id.toString();
            const tokenPayload = { userId, walletAddress, nickname }; // Include walletAddress and nickname
            const { token, refreshToken } = generateTokens(tokenPayload);
            // Log the token payload before sending it back
            logger_1.default.info('Token payload:', tokenPayload);
            return res.status(200).json({ message: 'OK', player: existingPlayer, token, refreshToken });
        }
        ;
        // Check if nickname is already taken by another player
        const playerWithSameNickname = yield player_1.default.findOne({ nickname });
        if (playerWithSameNickname) {
            const alternativeNicknames = generateAlternativeNicknames(nickname);
            return res.status(409).json({
                error: 'Nickname already taken by another player',
                alternatives: alternativeNicknames
            });
        }
        ;
        // Check if wallet address is already taken by another player
        const playerWithSameWallet = yield player_1.default.findOne({ walletAddress });
        if (playerWithSameWallet) {
            return res.status(409).json({ error: 'Wallet address already registered by another player. Please choose a different wallet address.' });
        }
        ;
        // Create new player
        const newPlayer = yield player_1.default.create({
            walletAddress,
            nickname,
            isOnline: true,
            battleLog: [],
            notification_BattleRequest: {
                isRead: false,
                challengers: [],
                acceptedChallengers: [],
            },
            battleMeta: {
                description: '',
                id: '',
                attributes: [],
            }
        });
        // Check if SECRET_KEY environment variable is set and accessible
        if (!process.env.SECRET_KEY) {
            return res.status(500).json({ error: 'Internal server error. Missing SECRET_KEY.' });
        }
        // Generate JWT token and refresh token for the newly created player
        const userId = newPlayer._id.toString();
        const tokenPayload = { userId, walletAddress, nickname }; // Include walletAddress and nickname
        const { token, refreshToken } = generateTokens(tokenPayload);
        // Log the token payload before sending it back
        logger_1.default.info('Token payload:', tokenPayload);
        return res.status(201).json({ message: 'Player created successfully', player: newPlayer, token, refreshToken });
    }
    catch (error) {
        logger_1.default.error('Error creating player:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.signup = signup;
const switchCharacter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress, battleMeta } = req.body;
    if (!walletAddress || !battleMeta) {
        return res.status(400).send('walletAddress and battlemeta required');
    }
    try {
        // Verify that the provided walletAddress corresponds to an existing player
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Check for non-empty strings in required fields
        if (battleMeta.description.trim() === '' || battleMeta.id.trim() === '' || battleMeta.attributes.some((attr) => attr.trait_type.trim() === '' || attr.value.trim() === '')) {
            return res.status(400).json({ error: 'All fields must be filled' });
        }
        ;
        // Update player's battleMeta
        yield player_1.default.updateOne({ walletAddress }, { battleMeta });
        return res.status(200).json({ message: 'Character NFT switched successfully' });
    }
    catch (error) {
        logger_1.default.error('Error switching character NFT:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.switchCharacter = switchCharacter;
const getBattleMeta = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress } = req.body;
    try {
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Extract battleMeta from player data
        const { battleMeta } = player;
        return res.status(200).json({ battleMeta });
    }
    catch (error) {
        logger_1.default.error('Error getting battleMeta:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getBattleMeta = getBattleMeta;
const searchForPlayer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { nickname, walletAddress } = req.body;
        if (!nickname && !walletAddress) {
            return res.status(400).send('Either nickname or walletAddress is required');
        }
        // Extract the JWT token from the request headers
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            return res.status(401).send('Unauthorized');
        }
        // Verify the JWT token and extract user information
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, secretKey);
        }
        catch (error) {
            logger_1.default.error('Error verifying JWT token:', error);
            return res.status(401).send('Invalid token or token verification failed');
        }
        const currentUserWalletAddress = decodedToken.walletAddress;
        const currentUserNickname = decodedToken.nickname;
        // Check if the current user is trying to search for themselves
        if (walletAddress === currentUserWalletAddress || nickname === currentUserNickname) {
            return res.status(400).send('You cannot search for yourself');
        }
        // Prepare the search query
        const query = {};
        if (nickname) {
            query.nickname = nickname;
        }
        if (walletAddress) {
            query.walletAddress = walletAddress;
        }
        // Exclude the current user's data from the search
        if (walletAddress !== currentUserWalletAddress) {
            query.walletAddress = { $ne: currentUserWalletAddress };
        }
        // Find players matching the query
        const player = yield player_1.default.findOne(query).select('walletAddress').select(walletAddress);
        // Check if player is found
        if (!player) {
            return res.status(404).send('No player found');
        }
        res.json(player);
    }
    catch (error) {
        logger_1.default.error('Error searching for players:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.searchForPlayer = searchForPlayer;
const getPlayerOnlineStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { walletAddress } = req.params;
        // Find the player by wallet address
        const player = yield player_1.default.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Respond with the online status of the player
        res.json({ walletAddress: player.walletAddress, isOnline: player.isOnline });
    }
    catch (error) {
        logger_1.default.error('Error getting player online status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPlayerOnlineStatus = getPlayerOnlineStatus;
const sendFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { playersWallet, friendsNickname } = req.body;
        // Verify authorization
        const tokenWalletAddress = (_b = req.user) === null || _b === void 0 ? void 0 : _b.walletAddress;
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
        // Check if friend request already exists
        const existingRequest = yield friendList_1.default.findOne({ playerWallet: playersWallet, friendWallet: friend.walletAddress }).session(session);
        if (existingRequest) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Friend request already sent' });
        }
        // Create friend request
        const friendRequest = new friendList_1.default({ playerWallet: playersWallet, friendWallet: friend.walletAddress });
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
    var _e;
    try {
        const { friendWallet } = req.body;
        const walletAddress = (_e = req.user) === null || _e === void 0 ? void 0 : _e.walletAddress;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        // Find the current player
        const currentPlayer = yield player_1.default.findOne({ walletAddress });
        if (!currentPlayer) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Find the friend to unfriend
        const friendPlayer = yield player_1.default.findOne({ walletAddress: friendWallet });
        if (!friendPlayer) {
            return res.status(404).json({ error: 'Friend not found' });
        }
        // Remove friend from each other's friend list
        currentPlayer.friends = currentPlayer.friends.filter(friend => friend !== friendWallet);
        friendPlayer.friends = friendPlayer.friends.filter(friend => friend !== walletAddress);
        // Save changes
        yield currentPlayer.save();
        yield friendPlayer.save();
        res.json({ message: 'You are no longer friends' });
    }
    catch (error) {
        logger_1.default.error('Error unfriending:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.unfriend = unfriend;
const getSentFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token missing' });
    }
    try {
        const decodedToken = jsonwebtoken_1.default.verify(token, secretKey);
        // Extract user ID from decoded token
        const userId = decodedToken.userId;
        // Retrieve user information from the database
        const user = yield player_1.default.findById(userId);
        if (!user || !user.isOnline) {
            return res.status(401).json({ message: 'User is already logged out' });
        }
        // Update player's isOnline status to false upon logout
        yield player_1.default.updateOne({ _id: userId }, { $set: { isOnline: false } });
        // Include only the id and walletAddress fields in the response
        const userPayload = { id: user.id, walletAddress: user.walletAddress };
        return res.status(200).json({ message: 'You have logged out', user: userPayload });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            // Handle expired token error
            return res.status(401).json({ message: 'Access denied. Token expired' });
        }
        console.error('Error logging out player:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.logout = logout;
