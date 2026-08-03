import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || undefined; // undefined -> same-origin (works with Vite proxy in dev)

export const socket: Socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
