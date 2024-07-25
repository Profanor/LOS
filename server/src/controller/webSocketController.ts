import WebSocket from 'ws';
import logger from '../logger';

// Store WebSocket server instance
let wss: WebSocket.Server;

export const initializeWebSocket = (port: number) => {
  try {
  wss = new WebSocket.Server({ port });

  wss.on('connection', (ws: WebSocketWithNickname) => {
    ws.on('message', (message: string) => {
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
} catch (error) {
  logger.error('Error initializing WebSocket server:', error);
}
  return wss;
};

// Store nickname information with WebSocket connections
export interface WebSocketWithNickname extends WebSocket {
  nickname?: string;
}

export interface WebSocketWithWalletAddress extends WebSocket {
  walletAddress?: string;
}

export { wss };