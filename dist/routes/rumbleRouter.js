"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rumbleController_1 = require("../controller/rumbleController");
const router = express_1.default.Router();
router.post('/api/rumble/create', rumbleController_1.createRumble);
router.post('/api/rumble/join', rumbleController_1.joinRumble);
exports.default = router;
