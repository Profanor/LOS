"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = exports.initializeWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
// Store WebSocket server instance
let wss;
const initializeWebSocket = (port) => {
    try {
        exports.wss = wss = new ws_1.default.Server({ port });
        wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                // Handle messages from clients
                console.log(`Received message from ${ws.nickname}: ${message}`);
            });
            // Send a sample message to the server
            ws.send('Hello, and welcome to Project-LOS!');
            ws.on('close', () => {
                // Clean up when a client disconnects
                console.log(`${ws.nickname} disconnected`);
            });
        });
        console.log(`WebSocket server is running on port ${port}`);
    }
    catch (error) {
        logger.error('Error initializing WebSocket server:', error);
    }
    return wss;
};
exports.initializeWebSocket = initializeWebSocket;
