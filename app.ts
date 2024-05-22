import express from 'express';
import http from 'http';
import logger from 'morgan';
import index from './routes/index';
import playerRoutes from './routes/players'; 
import friendRequest from './routes/friendRequest';
import pvpRoutes from './routes/pvpRouter';
import teamRoutes from './routes/teamRouter';
import rumbleRoutes from './routes/rumbleRouter';
import notificationRoute from './routes/notifications';
import refreshToken from './routes/tokenRefreshRouter';
import { Server } from 'socket.io';
import { initializeWebSocket } from './controller/webSocketController';
import main from './config/database';
main();

const app = express();

//Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));
app.use('/', index);
app.use(playerRoutes);
app.use('/api/friendRequests', friendRequest);
app.use(pvpRoutes);
app.use(teamRoutes);
app.use(rumbleRoutes);
app.use(notificationRoute);
app.use("/api", refreshToken);

const server = http.createServer(app);

const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || '8080';
const wss = initializeWebSocket(parseInt(WEBSOCKET_PORT));

// Create Socket.IO server
const io = new Server(server);

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
