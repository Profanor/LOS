"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const devTest_1 = require("../controller/devTest");
const validateRequest_1 = require("../middleware/validateRequest");
const router = express_1.default.Router();
router.post('/confirm-tester', validateRequest_1.validateTesterRequest, devTest_1.devTest);
exports.default = router;
