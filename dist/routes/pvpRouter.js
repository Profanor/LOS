"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const pvpController_1 = require("../controller/pvpController");
router.post('/api/pvp/request', pvpController_1.sendPvpRequest);
router.post('/api/pvp/action', pvpController_1.handlePvpAction);
exports.default = router;
