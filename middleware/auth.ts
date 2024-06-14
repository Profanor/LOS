import { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import crypto from 'crypto';
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config(); 
import logger from "../logger";

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    userId: string;
  }
}

// Generate a random secret key of sufficient length
const generateSecretKey = (): string => {
  return crypto.randomBytes(32).toString('hex'); // Generate a 256-bit (32-byte) random string
};

const key: string = process.env.SECRET_KEY || generateSecretKey();

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) { 
  return res.status(401).json({ message: 'Access denied. Token missing' });
  }
  
  // Verify token
  jwt.verify(token, key, async (err: JsonWebTokenError | null, decodedToken: any) => {
    if (err) {
      logger.error('JWT verification failed:', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Access denied. Token expired' });
      } else {
        return res.status(401).json({ message: 'Access denied. Invalid token' });
      }
    }
    
    // Check token expiration and initiate token refresh if needed
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiration = decodedToken.exp;

    // If token expires within 5 minutes, refresh the token
    if (tokenExpiration - currentTime < 300) {
      try {
      // Call token refresh endpoint to get a new token
      const refreshTokenUrl = process.env.REFRESH_TOKEN_URL || 'http://localhost:3000/refresh-token';
      const response = await
      axios.post(refreshTokenUrl, null, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

        // Extract and verify new token
        const newToken = response.data.token;
        const newDecodedToken: any = jwt.verify(newToken, key);
        
        // Check new token payload for required user information
        if (!newDecodedToken || !newDecodedToken.walletAddress || !newDecodedToken.nickname || !newDecodedToken.userId) {
          logger.error('Invalid token or missing user information:', newDecodedToken);
          return res.status(401).send('Invalid token or missing user information');
        }

         // Update token in request headers
        req.headers['authorization'] = `Bearer ${newToken}`;
        next();
      }
      catch (error) {
        logger.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Token refresh failed' });
      }
    } else {
      // Token is valid and does not require refresh
      req.user = decodedToken;

    // Check if the token's user identifier matches the user attempting the action
    const userId = decodedToken.userId;
    // Ensure req.user is defined
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. User not authenticated' });
    }
    if (userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. Token does not belong to the user' });
    }
    next();
    }
  });
};

export default authenticateToken ;