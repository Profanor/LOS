"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const testerSchema = new mongoose_1.default.Schema({
    testID: {
        type: String,
        required: true,
        unique: true
    },
    deviceID: {
        type: String,
        required: true
    },
});
const AuthorizedTester = mongoose_1.default.model('AuthorizedTester', testerSchema);
exports.default = AuthorizedTester;
