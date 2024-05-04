"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tokenRefresh_1 = require("../controller/tokenRefresh");
const router = express_1.default.Router();
router.post('/refresh-token', tokenRefresh_1.handleRefresh);
exports.default = router;
