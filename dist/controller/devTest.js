"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devTest = void 0;
const devTest_1 = __importDefault(require("../models/devTest"));
const logger_1 = __importDefault(require("../logger"));
const devTest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { testID, deviceID } = req.body;
    if (!testID || !deviceID) {
        return res.status(400).json({ error: 'testID and deviceID are required' });
    }
    try {
        const tester = yield devTest_1.default.findOne({ testID });
        if (tester) {
            if (tester.deviceID) {
                if (tester.deviceID === deviceID) {
                    return res.json({ confirmed: true });
                }
                else {
                    return res.status(403).json({ error: 'Device ID does not match the registered device ID for this test ID.' });
                }
            }
            else {
                tester.deviceID = deviceID;
                yield tester.save();
                return res.json({ confirmed: true });
            }
        }
        else {
            return res.status(404).json({ error: 'Test ID not found.' });
        }
    }
    catch (error) {
        logger_1.default.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.devTest = devTest;
