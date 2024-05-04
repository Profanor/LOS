import { Request, Response } from "express";
import Player from '../models/player'
import jwt from 'jsonwebtoken';
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

const secretKey = process.env.SECRET_KEY;

if (!secretKey) {
    logger.error('Secret key is not provided. Please set the SECRET_KEY environment variable to a secure value.');
    process.exit(1); // Exit the process if secret key is not provided
  }

export const handleRefresh = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.headers.authorization?.split(' ')[1];
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token missing' });
        }
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, secretKey) as { userId: string };
        const userId = decoded.userId;

    // Check if the user exists (optional)
    const user = await Player.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId }, secretKey, { expiresIn: '15m' });

    res.json({ accessToken });
  } catch (error: any) {
    logger.error('Token refresh error:', error.stack);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
