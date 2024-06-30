import { Response, Request } from "express"; 
import Player from '../models/player';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import logger from "../logger";


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

        // Log the user ID before sending it back
        logger.info(`User logged in: ${userId}`);

        return res.status(200).json({ message: 'OK', player: existingPlayer, token, refreshToken });
      };

      // If nickname is already taken, generate alternatives
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

      // Log the user ID before sending it back
      logger.info(`Player created: ${userId}`);

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


export const getBattleLog = async (req: Request, res: Response) => {
  try {
    const { nickname, walletAddress } = req.body;

  if (!nickname && !walletAddress) {
    return res.status(400).send('Nickname or walletAddress is required');
  }

  // Prepare the search query
  const query: any = {};
  if (nickname) {
    query.nickname = nickname;
  }
  if (walletAddress) {
    query.walletAddress = walletAddress;
  }

  // Fetch the player based on the query
  const player = await Player.findOne(query);

  // If player is found, return the battle log
  if (player) {
    return res.status(200).json({ battleLog: player.battleLog });
  } else {
    // If no player is found, return an error message
    return res.status(404).send('Player not found');
  }

  } catch (error) {
    logger.error('Error fetching battle log:', error);
    res.status(500).json({ error: 'Internal server error' });
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