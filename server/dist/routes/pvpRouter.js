"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
const pvpController_1 = require("../controller/pvpController");
router.post('/api/pvp/request', auth_1.default, pvpController_1.sendPvpRequest);
router.post('/api/pvp/action', auth_1.default, pvpController_1.handlePvpAction);
router.post('/api/pvp/delete-accepted-challenger', auth_1.default, pvpController_1.deleteAcceptedChallenger);
exports.default = router;
