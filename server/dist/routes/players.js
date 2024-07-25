"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = __importDefault(require("../middleware/auth"));
const express_1 = __importDefault(require("express"));
const rateLimiter_1 = __importDefault(require("../middleware/rateLimiter"));
const playerController_1 = require("../controller/playerController");
const router = express_1.default.Router();
router.post('/api/players/signup', rateLimiter_1.default, playerController_1.signup);
router.post('/api/players/switch-character', auth_1.default, playerController_1.switchCharacter);
router.post('/api/players/get-battle-meta', auth_1.default, playerController_1.getBattleMeta);
router.post('/api/players/search', auth_1.default, playerController_1.searchForPlayer);
router.get('/api/players/battle-log', auth_1.default, playerController_1.getBattleLog);
router.get('/online-status/:walletAddress', auth_1.default, playerController_1.getPlayerOnlineStatus);
router.post('/logout', auth_1.default, playerController_1.logout);
exports.default = router;
