"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const webSocketController_1 = require("./controller/webSocketController");
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create HTTP server
const server = http_1.default.createServer(app_1.default);
// Create Socket.IO server
const io = new socket_io_1.Server(server);
// Real-time communication with Socket.IO
io.on('connection', (socket) => {
    console.log('A client connected');
    // Handle joining a room
    socket.on('join room', (roomName) => {
        socket.join(roomName);
        console.log(`Client joined room: ${roomName}`);
    });
    // Handle leaving a room
    socket.on('leave room', (roomName) => {
        socket.leave(roomName);
        console.log(`Client left room: ${roomName}`);
    });
    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});
const PORT = process.env.PORT || '3000';
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || '8080';
// Initialize Websocket
const wss = (0, webSocketController_1.initializeWebSocket)(parseInt(WEBSOCKET_PORT));
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
