import { Request, Response } from "express";
import { WebSocketWithNickname } from './webSocketController';
import { wss } from './webSocketController'; // Import WebSocket server instance
import { AuthenticatedRequest } from '../middleware/auth';
import Player from '../models/player';
import logger from "../logger";

export const sendPvpRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sendersWallet, receiver } = req.body;

      // Verify authorization
      const tokenWalletAddress = req.user?.walletAddress;
      if (sendersWallet !== tokenWalletAddress) {
          return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
      }
  
      // Validate input
      if (!sendersWallet && !receiver) {
        return res.status(400).json({ error: 'Either walletAddress or nickname is required' });
      }
  
      // Find sender
      let sender;
      if (sendersWallet) {
        sender = await Player.findOne({ walletAddress: sendersWallet });
        if (!sender) {
          return res.status(404).json({ error: 'Sender wallet address does not match any existing player' });
        }
      }
  
      let opponent;
      // Attempt to find the opponent using the walletAddress first
      if (receiver) {
        opponent = await Player.findOne({ $or: [{ walletAddress: receiver }, { nickname: receiver }]} );
      }
  
      // If opponent not found using walletAddress, try finding using nickname
      if (!opponent && sendersWallet) {
        opponent = await Player.findOne({ walletAddress: sendersWallet });
      }
  
      if (!opponent) {
        return res.status(404).json({ error: 'Opponent not found' });
      }
  
      // Send a WebSocket notification to the opponent
      const notification = {
        type: 'pvp_request',
        sender: sender ? sender.walletAddress : null,
        opponent: opponent.walletAddress,
        message: `You have received a PVP request from ${sender?.nickname}`,
        timestamp: Date.now()
        };
        wss.clients.forEach((client: WebSocketWithNickname) => {
            if (client.readyState === WebSocket.OPEN && client.nickname === opponent.nickname) {
                client.send(JSON.stringify(notification));
            }
        });
  
      
      // Add the opponent's wallet address and nickname to the player's notification_BattleRequest.challengers array
      if (sender) {
       await Player.findOneAndUpdate(
        { walletAddress: opponent.walletAddress },
        { $push: { 'notification_BattleRequest.challengers': { walletAddress: sender.walletAddress, nickname: sender.nickname, timestamp: Date.now() } } },
        { new: true }
      );
      } else {
        return res.status(404).json({ error: 'Sender not found' });
      }
        res.json({ message: 'PVP battle request sent successfully', sender: sender ? sender.walletAddress : null, opponent: opponent.walletAddress });
    } catch (error) {
        logger.error('Error sending PVP battle request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  }
  
export const handlePvpAction = async (req: AuthenticatedRequest, res: Response) => {
  try {
      const { walletAddress, index, type } = req.body;

      // Verify authorization
      const tokenWalletAddress = req.user?.walletAddress;
      if (walletAddress !== tokenWalletAddress) {
          return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
      }
   
      // Find the player
      const player = await Player.findOne({ walletAddress });
   
      // Check if player exists and has notification_BattleRequest
      if (!player || !player.notification_BattleRequest) {
         return res.status(404).json({ error: 'Player or notification_BattleRequest not found' });
      }
   
      // Handle the action based on the type (accept/decline/withdraw)
       switch (type) {
        case 'accept':
          // Check if the opponent's data needs to be updated in the sender's acceptedChallengers array
          if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
             const opponent = player.notification_BattleRequest.challengers[index];
  
             const oneMinuteInSeconds = 60; // 1 minute in seconds
  
             // Check if the request has expired (1 minute timeout)
             const requestTimestamp: Date | null | undefined = opponent.timestamp;
              if (requestTimestamp) {
                const currentTimeInSeconds = Math.floor(Date.now() / 1000); // Current time in seconds
                const requestTimeInSeconds = Math.floor(requestTimestamp.getTime() / 1000); // Request time in seconds
                const elapsedTimeInSeconds = currentTimeInSeconds - requestTimeInSeconds;
                if (elapsedTimeInSeconds > oneMinuteInSeconds) {
                  console.log(`PvP battle request from ${opponent.walletAddress} has expired (${elapsedTimeInSeconds} seconds elapsed).`);
                  
                  // Remove the expired request from the challenger's array
                  player.notification_BattleRequest.challengers.splice(index, 1);
                  await player.save();
                  return res.status(400).json({ error: 'PvP battle request has expired' });
                }
              } else {
                return res.status(400).json({ error: 'Invalid timestamp for PvP battle request' });
              }
  
             // Find the sender and update their acceptedChallengers array
             const sender = await Player.findOne({ walletAddress: opponent.walletAddress });
             if (sender && sender.notification_BattleRequest) {
                sender.notification_BattleRequest.acceptedChallengers.push({
                walletAddress: player.walletAddress,
                nickname: player.nickname
               });
               await sender.save();
             }
           } else {
             return res.status(400).json({ error: 'Invalid index' });
           }
           
           // Remove the challenger from the receivers challengers array
           player.notification_BattleRequest.challengers.splice(index, 1);
           break;

         case 'decline':
           // Remove the challenger from challengers array
           if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
             player.notification_BattleRequest.challengers.splice(index, 1);
           } else {
             return res.status(400).json({ error: 'Invalid index' });
           }
           break;

         case 'withdraw':
           // Remove the player from acceptedChallengers array
           if (player.notification_BattleRequest.acceptedChallengers && index < player.notification_BattleRequest.acceptedChallengers.length) {
             player.notification_BattleRequest.acceptedChallengers.splice(index, 1);
           } else {
             return res.status(400).json({ error: 'Invalid index' });
           }
           break;
         default:
           return res.status(400).json({ error: 'Invalid action type' });
       }
   
       await player.save();
   
       res.json({ message: `PVP battle request ${type}ed successfully` });
    } catch (error) {
       logger.error('Error handling PVP battle request action:', error);
       res.status(500).json({ error: 'Internal server error' });
    }
};


export const deleteAcceptedChallenger = async (req: AuthenticatedRequest, res: Response) => {
  try {
      const { walletAddress, index } = req.body;

      // Verify authorization
      const tokenWalletAddress = req.user?.walletAddress;
      if (walletAddress !== tokenWalletAddress) {
          return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
      }

      // Find the player
      const player = await Player.findOne({ walletAddress });

      // Check if player exists and has acceptedChallengers array
      if (!player || !player.notification_BattleRequest || !player.notification_BattleRequest.acceptedChallengers) {
        return res.status(404).json({ error: 'Player or acceptedChallengers not found' });
      }

      // Check if the provided index is valid
      if (index < 0 || index >= player.notification_BattleRequest.acceptedChallengers.length) {
        return res.status(400).json({ error: 'Invalid index' });
      }

      // Remove the entry at the specified index
      player.notification_BattleRequest.acceptedChallengers.splice(index, 1);

      // Save the updated player document
      await player.save();
      res.json({ message: 'Accepted challenger deleted successfully' });
  }
  catch (error) {
    logger.error('Error deleting accepted challenger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};