"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = exports.initializeWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = __importDefault(require("../logger"));
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
        logger_1.default.error('Error initializing WebSocket server:', error);
    }
    return wss;
};
exports.initializeWebSocket = initializeWebSocket;
