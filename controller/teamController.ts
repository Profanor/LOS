import { Response, Request } from "express"
import { wss } from './webSocketController'; // Import WebSocket server instance
import { WebSocketWithWalletAddress } from './webSocketController';
import Team from '../models/teams';

export const createTeam = async (req: Request, res: Response) => {
    try {
        const { teamName, owner } = req.body;
  
        // Check if owner information is provided
        if (!owner || !owner.walletAddress || !owner.nickname) {
          return res.status(400).json({ error: 'Owner information missing' });
        }

        // Check if team already exists
        const existingTeam = await Team.findOne({ teamName, owner });
        if (existingTeam) {
          return res.status(200).json({ 
            message: 'Your team exists already', 
            Team: existingTeam 
          });
        };

        // Check if team with the same name but different owner exists
        const teamWithSameName = await Team.findOne({ teamName });
        if (teamWithSameName) {
          return res.status(409).json({ 
            error: 'Teamname already taken'});
        };

        const team = new Team({
          teamName,
          owner: {
              walletAddress: owner.walletAddress,
              nickname: owner.nickname
          },
              members: [{ walletAddress: owner.walletAddress, nickname: owner.nickname }]
        });
        await team.save();
  
        // Send a WebSocket notification to owner indicating team creation
        const notification = {
          type: 'team_creation',
          message: `You've successfully created the team ${teamName}`,
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
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
};

export const joinTeam = async (req: Request, res: Response) => {
    try {
        const { teamName, teamOwner } = req.body;
    
        const team = await Team.findOne({ teamName });
        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }

         // Ensure that the members array is initialized
         team.members = team.members || [];

        // Check if the player is already a member of the team
        const isAlreadyMember = team.members.some(member => member.walletAddress === teamOwner.walletAddress);
        if (isAlreadyMember) {
            return res.status(400).json({ error: 'Player is already a member of this team' });
        }
        
        team.members.push({ walletAddress: teamOwner.walletAddress, nickname: teamOwner.nickname });
        await team.save();
  
        // Send a WebSocket notification to team owner indicating team join
        const notification = {
          type: 'team_join',
          message: `${teamOwner.nickname} has joined your team ${teamName}`,
              timestamp: Date.now()
          };
          wss.clients.forEach(client => {
            const ws = client as WebSocketWithWalletAddress;
              if (ws.readyState === WebSocket.OPEN && ws.walletAddress && ws.walletAddress === team.owner.walletAddress) {
                  client.send(JSON.stringify(notification));
              }
          });
    
        res.json({ message: 'Joined team successfully' });
      } catch (error) {
        console.error('Error joining team:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
};

export const declineInvite = async (req: Request, res: Response) => {
    try {
        const { teamName, walletAddress } = req.body;
    
        // remove the player's invitation from the specified team's invitation list
        const team = await Team.findOne({ teamName });
        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }
        // Ensure that the invitations array is initialized
        if (!team.invitations) {
          team.invitations = [];
          }
  
        team.invitations = team.invitations.filter(invitation => invitation.walletAddress !== walletAddress);
        await team.save();
    
        res.json({ message: 'Declined team invite successfully' });
      } catch (error) {
        console.error('Error declining team invite:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
};