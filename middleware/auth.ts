import { Response, Request, NextFunction } from "express";
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config(); 
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

interface AuthenticatedRequest extends Request {
  user?: any;
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
  
  jwt.verify(token, key, (err, user) => {
    if (err) {
      logger.error('JWT verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Check token expiration and initiate token refresh if needed
    const currentTime = Math.floor(Date.now() / 1000);
    const decodedToken: any = jwt.decode(token, { complete: true });
    const tokenExpiration = decodedToken.exp;

    // If token expires within 5 minutes, refresh the token
    if (tokenExpiration - currentTime < 300) {
      // Call token refresh endpoint to get a new token
      const refreshTokenUrl = process.env.REFRESH_TOKEN_URL || 'http://localhost:3000/refresh-token';

      axios.post(refreshTokenUrl, null, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then((response) => {
        // Update token in request headers
        const newToken = response.data.token;
        req.headers['authorization'] = `Bearer ${newToken}`;
        next();
      })
      .catch((error) => {
        logger.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Token refresh failed' });
      });
    } else {
      // Token is valid and does not require refresh
      req.user = user;
    next();
    }
  });
};

export default authenticateToken ;