import { Response, Request } from "express"; 
import { AuthenticatedRequest } from '../middleware/auth';
import { WebSocketWithNickname } from './webSocketController';
import { wss } from './webSocketController';
import logger from "../logger";
import mongoose from "mongoose";
import Player from '../models/player';

  
  export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { friendsNickname } = req.body;
      const playersWallet = req.user?.walletAddress;
  
      // Verify authorization
      const tokenWalletAddress = req.user?.walletAddress;
      if (playersWallet!== tokenWalletAddress) {
        return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
      }
  
      // Find the current player sending the request
      const player = await Player.findOne({ walletAddress: playersWallet }).session(session);
      if (!player) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Player not found' });
      }
  
      // Find the friend receiving the request
      const friend = await Player.findOne({ nickname: friendsNickname }).session(session);
      if (!friend) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Friend not found' });
      }
  
      // Check if friend request already exists (from either side)
      const existingRequest = player.friendRequests.find(req => req.senderWallet === friend.walletAddress && req.status === 'Pending') ||
        friend.friendRequests.find(req => req.senderWallet === playersWallet && req.status === 'Pending');
        if (existingRequest) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Friend request already pending' });
        }
  
      // Check if they are already friends is fixed
      const existingFriendship = player.friends.includes(friend.walletAddress) || 
      friend.friends.includes(player.walletAddress);
      if (existingFriendship) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'You are already friends' });
    }
  
    // Create new friend request
    const friendRequest = {
        senderWallet: playersWallet,
        senderNickname: player.nickname,
        requestId: new mongoose.Types.ObjectId(),
        timestamp: new Date(),
        status: 'Pending'
      };
  
      // Add the friend request to the receiver's friendRequests array
      friend.friendRequests.push(friendRequest);
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
  
      res.json({ message: 'Friend request sent successfully', requestId: friendRequest.requestId, status: friendRequest.status });
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

      // Check if requestId is valid
      if (!requestId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid request ID' });
    }


      // Find the receiver player
      const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
      if (!receiver) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Receiver not found' });
      }

      
      // Find the friend request by ID
      const friendRequest = receiver.friendRequests.find(req => req.requestId?.toString() === requestId);
      if (!friendRequest || friendRequest.status !== 'Pending') {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Friend request not found' });
      }
  
      // Update the friend request status to 'Accepted'
      friendRequest.status = 'Accepted';
  
      // Add each other to the friends list
      const sender = await Player.findOne({ walletAddress: friendRequest.senderWallet }).session(session);
      if (!receiver || !sender) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Player not found' });
      }
  
      receiver.friends.push(sender.walletAddress);
      sender.friends.push(receiver.walletAddress);
  

      // Remove the friend request from the receiver's friendRequests array
      const requestIndex = receiver.friendRequests.findIndex(req => req.requestId?.toString() === requestId);
      if (requestIndex !== -1) {
          receiver.friendRequests.splice(requestIndex, 1);
      }

      // Save the updated receiver after removal
      await receiver.save({ session });
      await sender.save({ session });
  
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

      // Check if requestId is valid
      if (!requestId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid request ID' });
    }

      // Find the receiver player
      const receiver = await Player.findOne({ walletAddress: receiverWallet }).session(session);
      if (!receiver) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Receiver not found' });
      }

      // Find the friend request by ID
      const friendRequestIndex = receiver.friendRequests.findIndex(req => req.requestId?.toString() === requestId);
      if (friendRequestIndex === -1 || receiver.friendRequests[friendRequestIndex].status !== 'Pending') {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Friend request not found or not pending' });
      }

      // Remove the friend request from the receiver's friendRequests array
      const [friendRequest] = receiver.friendRequests.splice(friendRequestIndex, 1);

      // Update the receiver's document
      await receiver.save({ session });
  
      // Update the senders friend request status to 'Declined'
      friendRequest.status = 'Declined';
      await friendRequest.save({ session });

  
      // find sender and receiver
      const sender = await Player.findOne({ walletAddress: friendRequest.senderWallet }).session(session);
      if (!sender) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Sender not found' });
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


export const getFriendRequestStatus = async (req: AuthenticatedRequest, res: Response) => {
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

        // Extract relevant information from friendRequestNotifications
        const friendRequestStatuses = player.friendRequestNotifications.map(notification => ({
            status: notification.status,
            timestamp: notification.timestamp,
            requestId: notification._id,
        }));

        res.json({ Status: friendRequestStatuses });
    } catch (error) {
        console.error('Error fetching friend request statuses:', error);
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