// src/socket.js
import { io } from 'socket.io-client';

const socket = io('https://online-code-collab-backend.onrender.com', {
  withCredentials: true,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('✅ Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

export default socket;