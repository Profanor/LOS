"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const friendRequestController_1 = require("../controller/friendRequestController");
const router = express_1.default.Router();
router.get('/', auth_1.default, friendRequestController_1.getFriendRequests);
router.post('/send', auth_1.default, friendRequestController_1.sendFriendRequest);
// router.post('/accept', authenticateToken, acceptFriendRequest);
// router.get('/status', authenticateToken, getSentFriendRequests);
// router.post('/decline', authenticateToken, declineFriendRequest);
router.post('/unfriend', auth_1.default, friendRequestController_1.unfriend);
router.get('/friends', auth_1.default, friendRequestController_1.getFriendsList);
exports.default = router;
