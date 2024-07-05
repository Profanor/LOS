import { Request, Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import Player from '../models/player';

interface Notification {
  type: 'pvp_request' | 'team_invitation' | 'rumble_invitation';
  timestamp: Date;
}

interface PlayerDocument {
    walletAddress: string;
    notifications: Notification[]; 
    friendRequests: any[];
    notification_BattleRequest?: any;
    battleLog?: any[];
}
  
interface PvpNotificationResponse {
    challengers: any[];
    acceptedChallengers: any[];
    battleHistory: any[];
}

export const handleNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { walletAddress, campaign } = req.body;

        // Verify authorization
        const tokenWalletAddress = req.user?.walletAddress;
        if (walletAddress !== tokenWalletAddress) {
            return res.status(403).json({ error: 'Access denied. Please use your wallet address.' });
        }
    
        // Logic for different types of events
        let response: any;
        switch (campaign) {
          case 'PVP':
            response = await handlePVPNotification(walletAddress);
            break;
          case 'TEAM':
            response = await handleTeamNotification(walletAddress);
            break;
          case 'Royal Rumble':
            response = await handleRumbleNotification(walletAddress);
            break;
          default:
            // Fallback to fetching all notifications if campaign type is not provided or invalid
            response = await fetchAllNotifications(walletAddress);
            break;
        }

        res.json(response);
      } catch (error) {
        console.error('Error handling notification:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
      const fetchAllNotifications = async (walletAddress: string):Promise<any> => {
        try {
      // Fetch all notifications for the player
      const player: PlayerDocument | null = await Player.findOne({ walletAddress });
      if (!player) {
          return { error: 'Player not found' };
        }
  
      // Return all notifications
      return { notifications: player.notifications };
    } catch (error) {
    console.error('Error fetching notifications:', error);
    return { error: 'Internal server error' };
  }
};
    
    // Function to handle PVP notifications
    const handlePVPNotification = async (walletAddress: string):Promise<PvpNotificationResponse | { error: string }> => {
      try {
      // Fetch PVP-related data from the database
      const player = await Player.findOne({ walletAddress });
      if (!player) {
        return { error: 'Player not found' };
      }

      // Check if notification_BattleRequest exists
      if (!player.notification_BattleRequest) {
        return { error: 'Notification_BattleRequest not found' };
      }
    
      // Extract data for PVP response
      const challengers = player.notification_BattleRequest.challengers;
      const acceptedChallengers = player.notification_BattleRequest.acceptedChallengers;
      const battleHistory = player.battleLog;
      
      return {
        challengers,
        acceptedChallengers,
        battleHistory
      }
      
    } catch (error) {
      console.error('Error handling PVP notification:', error);
      return { error: 'Internal server error' };
    }
  };
    
    // Function to handle Team notifications
    const handleTeamNotification = async (walletAddress: string) => {
      // Fetch Team-related data from the database
      const player = await Player.findOne({ walletAddress });
      if (!player) {
        return { error: 'Player not found' };
      }

    
      // Extract data for Team response
      const teams: any[] = []; 
      const teamInvitations: any[] = []; 
      const teamBattleInvitations: any[] = []; 
    
      return {
        teams,
        teamInvitations,
        teamBattleInvitations
      };
    };
    
    // Function to handle Royal Rumble notifications
    const handleRumbleNotification = async (walletAddress: string) => {
      // Fetch Royal Rumble-related data from the database
      const player = await Player.findOne({ walletAddress });
      if (!player) {
        return { error: 'Player not found' };
      }
    
      // Extract data for Royal Rumble response
      const rumbleInvitations: any[] = [];
    
      return {
        rumbleInvitations
      };
};
