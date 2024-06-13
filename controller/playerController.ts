import { Response, Request } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import Player from '../models/player';
import FriendList from '../models/friendList';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";
import logger from "../logger";
import { wss } from './webSocketController'; 
import { WebSocketWithNickname } from './webSocketController';
import { v4 as uuidv4 } from 'uuid';

// Function to generate a random secret key
const generateSecretKey = (): string => {
  return crypto.randomBytes(32).toString('hex'); // Generate a 256-bit (32-byte) random string
};

// Generate a random secret key or use one from environment variables
const secretKey = process.env.SECRET_KEY || generateSecretKey();

//Function to generate JWT access token and refresh token based on the provided payload.
const generateTokens = (tokenPayload: { userId: string; walletAddress: string; nickname: string }): { token: string, refreshToken: string } => {
  const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });
  const refreshTokenPayload = { userId: tokenPayload.userId, walletAddress: tokenPayload.walletAddress, nickname: tokenPayload.nickname }; // Include walletAddress and nickname
  const refreshToken = jwt.sign(refreshTokenPayload, secretKey, { expiresIn: '7d' });
  return { token, refreshToken };
};

// Function to generate alternative nicknames
const generateAlternativeNicknames = (nickname: string) => {
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
}


export const signup = async (req: Request, res: Response) => {
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
      const existingPlayer = await Player.findOne({ nickname, walletAddress });
      if (existingPlayer) {
        // Player already exists, update isOnline status to true
        await Player.updateOne({ _id: existingPlayer._id }, { $set: { isOnline: true } });

        // If player exists, generate JWT token and send it back to the client
        const userId = existingPlayer._id.toString();
        const tokenPayload = { userId, walletAddress, nickname }; // Include walletAddress and nickname
        const { token, refreshToken } = generateTokens(tokenPayload);

        // Log the token payload before sending it back
        logger.info('Token payload:', tokenPayload);

        return res.status(200).json({ message: 'OK', player: existingPlayer, token, refreshToken });
      };

      // Check if nickname is already taken by another player
      const playerWithSameNickname = await Player.findOne({ nickname });
      if (playerWithSameNickname) {
        const alternativeNicknames = generateAlternativeNicknames(nickname);
        return res.status(409).json({ 
          error: 'Nickname already taken by another player', 
          alternatives: alternativeNicknames
        });
      };

       // Check if wallet address is already taken by another player
       const playerWithSameWallet = await Player.findOne({ walletAddress });
       if (playerWithSameWallet) {
         return res.status(409).json({ error: 'Wallet address already registered by another player. Please choose a different wallet address.' });
       };
  
      // Create new player
      const newPlayer = await Player.create({
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
      logger.info('Token payload:', tokenPayload);

      return res.status(201).json({ message: 'Player created successfully', player: newPlayer, token, refreshToken });
      
    } catch (error) {
      logger.error('Error creating player:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};


export const switchCharacter = async (req: Request, res: Response) => {
    const { walletAddress, battleMeta } = req.body;

    if(!walletAddress || !battleMeta) {
      return res.status(400).send('walletAddress and battlemeta required');
    }

    try { 
      // Verify that the provided walletAddress corresponds to an existing player
      const player = await Player.findOne({ walletAddress });
      if (!player) {
          return res.status(404).json({ error: 'Player not found' });
      }

      // Check for non-empty strings in required fields
      if (battleMeta.description.trim() === '' || battleMeta.id.trim() === '' || battleMeta.attributes.some((attr: { trait_type: string; value: string; }) => attr.trait_type.trim() === '' || attr.value.trim() === '')) {
        return res.status(400).json({ error: 'All fields must be filled' });
      };

      // Update player's battleMeta
      await Player.updateOne({ walletAddress }, { battleMeta });
  
      return res.status(200).json({ message: 'Character NFT switched successfully' });
    } catch (error) {
      logger.error('Error switching character NFT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};


export const getBattleMeta = async (req: Request, res: Response) => {
    const { walletAddress } = req.body;
  
    try {
      const player = await Player.findOne({ walletAddress });
  
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
  
      // Extract battleMeta from player data
      const { battleMeta } = player;
  
      return res.status(200).json({ battleMeta });
    } catch (error) {
      logger.error('Error getting battleMeta:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};


export const searchForPlayer = async (req: Request, res: Response) => {
  try {
    const { nickname, walletAddress } = req.body;

    if (!nickname && !walletAddress) {
      return res.status(400).send('Either nickname or walletAddress is required');
    }

    // Extract the JWT token from the request headers
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    // Verify the JWT token and extract user information
    let decodedToken: any;
    try {
      decodedToken = jwt.verify(token, secretKey) as { userId: string; walletAddress: string; nickname: string };
    } catch (error) {
      logger.error('Error verifying JWT token:', error);
      return res.status(401).send('Invalid token or token verification failed');
    }

    const currentUserWalletAddress = decodedToken.walletAddress;
    const currentUserNickname = decodedToken.nickname;

    // Check if the current user is trying to search for themselves
    if (walletAddress === currentUserWalletAddress || nickname === currentUserNickname) {
      return res.status(400).send('You cannot search for yourself');
    }

    // Prepare the search query
    const query: any = {};
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
    const player = await Player.findOne(query).select('walletAddress').select(walletAddress);

    // Check if player is found
    if (!player) {
      return res.status(404).send('No player found');
    }

    res.json(player);
  } catch (error) {
    logger.error('Error searching for players:', error);
    res.status(500).json({ error: 'Internal server error' });
 }
};


export const getPlayerOnlineStatus = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Find the player by wallet address
    const player = await Player.findOne({ walletAddress });

    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    // Respond with the online status of the player
    res.json({ walletAddress: player.walletAddress, isOnline: player.isOnline });
    } catch (error) {
    logger.error('Error getting player online status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { playersWallet, friendsNickname } = req.body;

    // Verify authorization
    const tokenWalletAddress = req.user?.walletAddress;
    if (playersWallet !== tokenWalletAddress) {
        return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
    }

    // Check if both player and friend exist
    const player = await Player.findOne({ walletAddress: playersWallet }).session(session);
    const friend = await Player.findOne({ nickname: friendsNickname }).session(session);
    if (!player || !friend) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Player or friend not found' });
    }

    // Check if there is a pending friend request
    const pendingRequest = await FriendList.findOne({
      playerWallet: playersWallet,
      friendWallet: friend.walletAddress,
      status: 'Pending'
    }).session(session);

    if (pendingRequest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    // Check if they are already friends
    const existingFriendship = await FriendList.findOne({
      $or: [
        { playerWallet: playersWallet, friendWallet: friend.walletAddress, status: 'Accepted' },
        { playerWallet: friend.walletAddress, friendWallet: playersWallet, status: 'Accepted' }
      ]
    }).session(session);

    if (existingFriendship) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'You are already friends' });
    }

    // Create friend request
    const friendRequest = new FriendList({ playerWallet: playersWallet, friendWallet: friend.walletAddress, status: 'Pending' });
    await friendRequest.save({ session });

    // Add the friend request to the receiver's friendRequests array
    friend.friendRequests.push({
      senderWallet: player.walletAddress,
      senderNickname: player.nickname,
      requestId: friendRequest._id,
      timestamp: new Date(),
      status: 'Pending'
    });
    await friend.save({ session });

    // Notify receiver via websocket
    const notification = {
      type: 'friend_request',
      sender: player.walletAddress,
      message: `You have a new friend request from ${player.nickname}`,
      timestamp: Date.now()
    };
    wss.clients.forEach((client: WebSocketWithNickname) => {
      if (client.readyState === WebSocket.OPEN && client.nickname === friend.nickname) {
        client.send(JSON.stringify(notification));
      }
    });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Friend request sent successfully', requestId: friendRequest._id, status: friendRequest.status });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receiverWallet, requestId } = req.body;

    // Verify authorization
    const tokenWalletAddress = req.user?.walletAddress;
    if (receiverWallet !== tokenWalletAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
    }

    // Find the friend request by ID
    const friendRequest = await FriendList.findById(requestId).session(session);
    if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update the friend request status to 'Accepted'
    friendRequest.status = 'Accepted';
    await friendRequest.save({ session });

    // Add each other to the friends list
    const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
    const sender = await Player.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
    if (!receiver || !sender) {
      await session.abortTransaction();
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
    }) as mongoose.Types.DocumentArray<{
      status: "Pending" | "Accepted" | "Declined";
      timestamp?: Date | null | undefined;
      senderWallet?: string | null | undefined;
      senderNickname?: string | null | undefined;
    }>;

    // Add a friend request notification to the sender
    sender.friendRequestNotifications.push({
      receiverNickname: receiver.nickname,
      status: 'Accepted',
      timestamp: new Date()
    });


    await receiver.save({ session });
    await sender.save({ session });

    // Notify sender via websocket
    const notification = {
      type: 'friend_request_accepted',
      receiver: receiver.walletAddress,
      message: `${receiver.nickname} has accepted your friend request.`,
      timestamp: Date.now()
    };
    wss.clients.forEach((client: WebSocketWithNickname) => {
      if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
        client.send(JSON.stringify(notification));
      }
    });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Friend request accepted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const declineFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receiverWallet, requestId } = req.body;

    // Verify authorization
    const tokenWalletAddress = req.user?.walletAddress;
    if (receiverWallet !== tokenWalletAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
    }

    // Find the friend request by ID
    const friendRequest = await FriendList.findById(requestId).session(session);
    if (!friendRequest || friendRequest.friendWallet !== receiverWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update the senders friend request status to 'Declined'
    friendRequest.status = 'Declined';
    await friendRequest.save({ session });

    // find sender and receiver
    const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
    const sender = await Player.findOne({ walletAddress: friendRequest.playerWallet }).session(session);
    if (!receiver || !sender) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Player not found' });
    }

    // Remove the friend request from the receiver's friendRequests array
    await Player.findOneAndUpdate(
      { walletAddress: receiverWallet },
      { $pull: { friendRequests: { requestId: friendRequest._id } } },
      { session }
    );

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
    await sender.save({ session });

    wss.clients.forEach((client: WebSocketWithNickname) => {
      if (client.readyState === WebSocket.OPEN && client.nickname === sender.nickname) {
        client.send(JSON.stringify(notification));
      }
    });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Friend request declined successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const unfriend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { friendWallet } = req.body;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Find the current player
    const currentPlayer = await Player.findOne({ walletAddress });

    if (!currentPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Find the friend to unfriend
    const friendPlayer = await Player.findOne({ walletAddress: friendWallet });

    if (!friendPlayer) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    // Remove friend from each other's friend list
    currentPlayer.friends = currentPlayer.friends.filter(friend => friend !== friendWallet);
    friendPlayer.friends = friendPlayer.friends.filter(friend => friend !== walletAddress);

    // Save changes
    await currentPlayer.save();
    await friendPlayer.save();

    res.json({ message: 'You are no longer friends' });
  } catch (error) {
    logger.error('Error unfriending:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getSentFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Find the player by wallet address
    const player = await Player.findOne({ walletAddress });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch sent friend requests with their statuses
    const sentRequests = await FriendList.find({ playerWallet: walletAddress });

    // Fetch nicknames for each friendWallet
    const friendWallets = sentRequests.map(request => request.friendWallet).filter((wallet): wallet is string => !!wallet);
    const friends = await Player.find({ walletAddress: { $in: friendWallets } });

    // Create a map of walletAddress to nickname
    const nicknameMap: { [key: string]: string } = friends.reduce((map, friend) => {
      map[friend.walletAddress] = friend.nickname;
      return map;
    }, {} as { [key: string]: string });

    // Extract relevant information
    const sentRequestsInfo = sentRequests.map(request => ({
      friendWallet: request.friendWallet ?? 'Unknown',
      nickname: request.friendWallet ? nicknameMap[request.friendWallet] || 'Unknown' : 'Unknown',
      status: request.status,
      timestamp: request.timestamp
    }));

    res.json({ sentRequests: sentRequestsInfo });
  } catch (error) {
    console.error('Error fetching sent friend requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Find the player by wallet address
    const player = await Player.findOne({ walletAddress });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Map over friendRequests and exclude the _id field
    const friendRequestsWithoutId = player.friendRequests.map(request => ({
     ...request.toObject(), // Convert Mongoose document to plain object
      _id: undefined // Explicitly exclude _id
    }));

    res.json({ friendRequests: friendRequestsWithoutId });

  } catch (error) {
    console.error('Error fetching friend requests list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
      return res.status(401).json({ message: 'Access denied. Token missing' });
  }

  try {
      const decodedToken = jwt.verify(token, secretKey) as { userId: string };

      // Extract user ID from decoded token
      const userId = decodedToken.userId;

      // Retrieve user information from the database
      const user = await Player.findById(userId);

      if (!user || !user.isOnline) {
        return res.status(401).json({ message: 'User is already logged out' });
      }

      // Update player's isOnline status to false upon logout
      await Player.updateOne({ _id: userId }, { $set: { isOnline: false } });

      // Include only the id and walletAddress fields in the response
      const userPayload = { id: user.id, walletAddress: user.walletAddress };
      
      return res.status(200).json({ message: 'You have logged out', user: userPayload });
  } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Handle expired token error
        return res.status(401).json({ message: 'Access denied. Token expired' });
      }
      console.error('Error logging out player:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
};