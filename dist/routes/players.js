"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = __importDefault(require("../middleware/auth"));
const express_1 = __importDefault(require("express"));
const playerController_1 = require("../controller/playerController");
const router = express_1.default.Router();
router.post('/api/players/signup', playerController_1.signup);
router.post('/api/players/switch-character', auth_1.default, playerController_1.switchCharacter);
router.post('/api/players/get-battle-meta', auth_1.default, playerController_1.getBattleMeta);
router.post('/api/players/search', auth_1.default, playerController_1.searchForPlayer);
router.get('/online-status/:walletAddress', auth_1.default, playerController_1.getPlayerOnlineStatus);
router.post('/logout', auth_1.default, playerController_1.logout);
exports.default = router;
