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
exports.handleRefresh = void 0;
const player_1 = __importDefault(require("../models/player"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../logger"));
const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
    logger_1.default.error('Secret key is not provided. Please set the SECRET_KEY environment variable to a secure value.');
    process.exit(1); // Exit the process if secret key is not provided
}
const handleRefresh = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const refreshToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token missing' });
        }
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, secretKey);
        const userId = decoded.userId;
        // Check if the user exists (optional)
        const user = yield player_1.default.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Generate new access token
        const accessToken = jsonwebtoken_1.default.sign({ userId }, secretKey, { expiresIn: '15m' });
        res.json({ accessToken });
    }
    catch (error) {
        logger_1.default.error('Token refresh error:', error.stack);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
exports.handleRefresh = handleRefresh;
