import { Request, Response } from "express";
import { WebSocketWithNickname } from './webSocketController';
import { wss } from './webSocketController'; // Import WebSocket server instance
import Player from '../models/player';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine( 
          winston.format.timestamp(),
          winston.format.json()
 ),
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'error.log', level: 'error' }), 
    new winston.transports.File({ filename: 'combined.log' }) 
  ]
});


export const sendPvpRequest = async (req: Request, res: Response) => {
    try {
      const { sendersWallet, receiver } = req.body;
  
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
  
  
  export const handlePvpAction = async (req: Request, res: Response) => {
      try {
          const { walletAddress, index, type } = req.body;
  
          // Find the player within a transaction
          const session = await Player.startSession();
          session.startTransaction();
          try {
              const player = await Player.findOne({ walletAddress }).session(session);
  
              if (!player || !player.notification_BattleRequest) {
                  return res.status(404).json({ error: 'Player or notification_BattleRequest not found' });
              }
  
              switch (type) {
                  case 'accept':
                      if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                          const opponent = player.notification_BattleRequest.challengers[index];
                          const oneMinuteInSeconds = 60;
  
                          const requestTimestamp = opponent.timestamp;
                          if (requestTimestamp) {
                              const currentTimeInSeconds = Math.floor(Date.now() / 1000);
                              const requestTimeInSeconds = Math.floor(requestTimestamp.getTime() / 1000);
                              const elapsedTimeInSeconds = currentTimeInSeconds - requestTimeInSeconds;
                              if (elapsedTimeInSeconds > oneMinuteInSeconds) {
                                  console.log(`PvP battle request from ${opponent.walletAddress} has expired (${elapsedTimeInSeconds} seconds elapsed).`);
                                  player.notification_BattleRequest.challengers.splice(index, 1);
                                  await player.save();
                                  await session.commitTransaction();
                                  session.endSession();
                                  return res.status(400).json({ error: 'PvP battle request has expired' });
                              }
                          } else {
                              return res.status(400).json({ error: 'Invalid timestamp for PvP battle request' });
                          }
  
                          const sender = await Player.findOne({ walletAddress: opponent.walletAddress }).session(session);
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
                      break;
                  case 'decline':
                      if (player.notification_BattleRequest.challengers && index < player.notification_BattleRequest.challengers.length) {
                          player.notification_BattleRequest.challengers.splice(index, 1);
                      } else {
                          return res.status(400).json({ error: 'Invalid index' });
                      }
                      break;
                  case 'withdraw':
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
              await session.commitTransaction();
              session.endSession();
              res.json({ message: `PVP battle request ${type}ed successfully` });
          } catch (error) {
              await session.abortTransaction();
              session.endSession();
              console.error('Error handling PVP battle request action:', error);
              res.status(500).json({ error: 'Internal server error' });
          }
      } catch (error) {
          console.error('Error handling PVP battle request action:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  };
  