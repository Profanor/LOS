"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const morgan_1 = __importDefault(require("morgan"));
const players_1 = __importDefault(require("./routes/players"));
const pvpRouter_1 = __importDefault(require("./routes/pvpRouter"));
const teamRouter_1 = __importDefault(require("./routes/teamRouter"));
const rumbleRouter_1 = __importDefault(require("./routes/rumbleRouter"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const tokenRefreshRouter_1 = __importDefault(require("./routes/tokenRefreshRouter"));
const socket_io_1 = require("socket.io");
const webSocketController_1 = require("./controller/webSocketController");
const database_1 = __importDefault(require("./config/database"));
(0, database_1.default)();
const app = (0, express_1.default)();
//Middleware Setup
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, morgan_1.default)('dev'));
app.use(players_1.default);
app.use(pvpRouter_1.default);
app.use(teamRouter_1.default);
app.use(rumbleRouter_1.default);
app.use(notifications_1.default);
app.use("/api", tokenRefreshRouter_1.default);
const server = http_1.default.createServer(app);
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || '8080';
const wss = (0, webSocketController_1.initializeWebSocket)(parseInt(WEBSOCKET_PORT));
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
const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
