"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controller/teamController");
const router = express_1.default.Router();
router.post('/api/team/create', teamController_1.createTeam);
router.post('/api/team/join', teamController_1.joinTeam);
router.post('/api/team/decline-invite', teamController_1.declineInvite);
exports.default = router;
