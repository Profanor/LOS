"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const playerController_1 = require("../controller/playerController");
const router = express_1.default.Router();
router.post('/send', auth_1.default, playerController_1.sendFriendRequest);
router.post('/accept', auth_1.default, playerController_1.acceptFriendRequest);
router.get('/status', auth_1.default, playerController_1.getSentFriendRequests);
router.post('/decline', auth_1.default, playerController_1.declineFriendRequest);
router.post('/unfriend', auth_1.default, playerController_1.unfriend);
exports.default = router;
