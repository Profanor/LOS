import http from 'http';
import { Server } from 'socket.io';
import { initializeWebSocket } from './controller/webSocketController';
import app from './app'; 
import dotenv from 'dotenv';

dotenv.config(); 

// Create HTTP server
const server = http.createServer(app);

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

const PORT = process.env.PORT || '3000';
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || '8080';

// Initialize Websocket
const wss = initializeWebSocket(parseInt(WEBSOCKET_PORT));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });