import { Response, Request } from "express";
import { WebSocketWithWalletAddress } from './webSocketController';
import { wss } from './webSocketController'; // Import WebSocket server instance
import RoyalRumble from '../models/rumble';
import Player from "../models/player";

export const createRumble = async (req: Request, res: Response) => {
    try {
        const { rumbleName, rumbleReward, owner } = req.body;

        // Check if the owner's wallet address or nickname exists in the database
        const existingOwner = await Player.findOne({ $or: [{ walletAddress: owner.walletAddress }, { nickname: owner.nickname }] });
        if (!existingOwner) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        const rumble = new RoyalRumble({
          rumbleName,
          rumbleReward,
          owner: { walletAddress: owner.walletAddress, nickname: owner.nickname },
          participants: [{ walletAddress: owner.walletAddress, nickname: owner.nickname }]
        });
        await rumble.save();
  
        // Send a WebSocket notification to owner indicating Royal Rumble match creation
        const notification = {
          type: 'rumble_creation',
          message: `You've successfully created the Royal Rumble match ${rumbleName}`,
          timestamp: Date.now()
          };
          wss.clients.forEach(client => {
            const ws = client as WebSocketWithWalletAddress;
              if (ws.readyState === WebSocket.OPEN && ws.walletAddress === owner.walletAddress) {
                  ws.send(JSON.stringify(notification));
              }
          });
    
        res.json({ status: 'created' });
      } catch (error) {
        console.error('Error creating Royal Rumble match:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
};

export const joinRumble = async (req: Request, res: Response) => {
  try {
      const { rumbleName, teamOwner } = req.body;

      // Check if the rumblename and teamowner object exist
      if (!rumbleName || !teamOwner) {
          return res.status(400).json({ error: 'Invalid request: rumblename or teamowner does not exist' });
      }

      const rumble = await RoyalRumble.findOne({ rumbleName });
      if (!rumble) {
          return res.status(404).json({ error: 'Royal Rumble match not found' });
      }

      // Check if the team owner exists in the database
      const owner = await Player.findOne({ walletAddress: teamOwner.walletAddress });
      if (!owner) {
        return res.status(404).json({ error: 'Team owner not found' });
      }

      // Ensure that the participants array is initialized
      if (!rumble.participants) {
          rumble.participants = [];
      }

      // Check if the team owner is already a participant
      const isAlreadyParticipant = rumble.participants.some(participant => participant.walletAddress === teamOwner.walletAddress);
      if (isAlreadyParticipant) {
        return res.status(400).json({ error: 'Team owner is already a participant in this Royal Rumble match' });
      }

      rumble.participants.push({ walletAddress: teamOwner.walletAddress, nickname: teamOwner.nickname });
      await rumble.save();

      // Send a WebSocket notification to the match owner indicating a new participant
      const notification = {
          type: 'rumble_join',
          message: `${teamOwner.nickname} has joined your Royal Rumble match ${rumbleName}`,
          timestamp: Date.now()
      };

      // Perform a null check on owner.walletAddress before accessing it
      if (rumble.owner && rumble.owner.walletAddress) {
          wss.clients.forEach(client => {
              const ws = client as WebSocketWithWalletAddress;
              if (ws.readyState === WebSocket.OPEN && ws.walletAddress === owner.walletAddress) {
                  client.send(JSON.stringify(notification));
              }
          });
      }
      res.json({ message: 'Joined Royal Rumble match successfully' });
  } catch (error) {
      console.error('Error joining Royal Rumble match:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};
