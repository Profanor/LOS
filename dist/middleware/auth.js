"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
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
    jsonwebtoken_1.default.verify(token, key, (err, user) => {
        if (err) {
            logger.error('JWT verification failed:', err.message);
            return res.status(401).json({ message: 'Invalid token' });
        }
        // Check token expiration and initiate token refresh if needed
        const currentTime = Math.floor(Date.now() / 1000);
        const decodedToken = jsonwebtoken_1.default.decode(token, { complete: true });
        const tokenExpiration = decodedToken.exp;
        // If token expires within 5 minutes, refresh the token
        if (tokenExpiration - currentTime < 300) {
            // Call token refresh endpoint to get a new token
            const refreshTokenUrl = process.env.REFRESH_TOKEN_URL || 'http://localhost:3000/refresh-token';
            axios_1.default.post(refreshTokenUrl, null, {
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
        }
        else {
            // Token is valid and does not require refresh
            req.user = user;
            next();
        }
    });
};
exports.default = authenticateToken;
