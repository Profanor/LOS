"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger_1 = __importDefault(require("../logger"));
// Generate a random secret key of sufficient length
const generateSecretKey = () => {
    return crypto_1.default.randomBytes(32).toString('hex'); // Generate a 256-bit (32-byte) random string
};
const key = process.env.SECRET_KEY || generateSecretKey();
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token missing' });
    }
    // Verify token
    jsonwebtoken_1.default.verify(token, key, (err, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            logger_1.default.error('JWT verification failed:', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Access denied. Token expired' });
            }
            else {
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
                const response = yield axios_1.default.post(refreshTokenUrl, null, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                // Extract and verify new token
                const newToken = response.data.token;
                const newDecodedToken = jsonwebtoken_1.default.verify(newToken, key);
                // Check new token payload for required user information
                if (!newDecodedToken || !newDecodedToken.walletAddress || !newDecodedToken.nickname || !newDecodedToken.userId) {
                    logger_1.default.error('Invalid token or missing user information:', newDecodedToken);
                    return res.status(401).send('Invalid token or missing user information');
                }
                // Update token in request headers
                req.headers['authorization'] = `Bearer ${newToken}`;
                next();
            }
            catch (error) {
                logger_1.default.error('Token refresh error:', error);
                return res.status(500).json({ error: 'Token refresh failed' });
            }
        }
        else {
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
    }));
};
exports.default = authenticateToken;
