import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './game/RoomManager';
import { registerSocketHandlers } from './sockets/handlers';

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Serve the built client (client/dist) if it exists, so a single process can host everything.
// Resolved from process.cwd() (always the server/ package root, in both dev and `npm start`)
// rather than __dirname, which sits at a different nesting depth in the compiled dist output.
const clientDist = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e5,
});

const rooms = new RoomManager(io);
registerSocketHandlers(io, rooms);

httpServer.listen(PORT, () => {
  console.log(`Poker server listening on http://localhost:${PORT}`);
});
