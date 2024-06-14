import { Response, Request } from "express"; 
import { AuthenticatedRequest } from '../middleware/auth';
import { WebSocketWithNickname } from './webSocketController';
import { wss } from './webSocketController';
import logger from "../logger";
import mongoose from "mongoose";
import Player from '../models/player';
import FriendList from '../models/friendList';

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
  
  
  //Modified this endpoint to query the Player Schema instead of the friendList schema
  export const unfriend = async (req: AuthenticatedRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { friendWallet } = req.body;
        const walletAddress = req.user?.walletAddress;

        if (!walletAddress) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        const currentPlayer = await Player.findOne({ walletAddress }).session(session);
        if (!currentPlayer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Player not found' });
        }

        const friendPlayer = await Player.findOne({ walletAddress: friendWallet }).session(session);
        if (!friendPlayer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Friend not found' });
        }

        currentPlayer.friends = currentPlayer.friends.filter(friend => friend !== friendWallet);
        friendPlayer.friends = friendPlayer.friends.filter(friend => friend !== walletAddress);

        await currentPlayer.save({ session });
        await friendPlayer.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'You are no longer friends' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error unfriending:', error);
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

  
  //Does not reference the friendList Schema so safe for now
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

  
  //Modified this endpoint to query the Player Schema directly instead of friendList schema
  export const getFriendsList = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const walletAddress = req.user?.walletAddress;

        const player = await Player.findOne({ walletAddress });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const friends = await Player.find({ walletAddress: { $in: player.friends } })
            .select('nickname walletAddress');

        res.json({ friendDetails: friends });
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

  