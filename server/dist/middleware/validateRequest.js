"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTesterRequest = void 0;
const validateTesterRequest = (req, res, next) => {
    const { testID, deviceID } = req.body;
    if (!testID || !deviceID) {
        return res.status(400).json({ error: 'testID and deviceID are required' });
    }
    next();
};
exports.validateTesterRequest = validateTesterRequest;
