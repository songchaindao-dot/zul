import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import createRoom from './api/rooms/create.js';
import joinRoom from './api/rooms/join.js';
import sendMessage from './api/messages/send.js';
import finalizeVoice from './api/voice/finalize.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/rooms/create', createRoom);
app.post('/api/rooms/join', joinRoom);
app.post('/api/messages/send', sendMessage);
app.post('/api/voice/finalize', finalizeVoice);

app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

app.listen(3000, () => {
  console.log('API dev server running on http://localhost:3000');
  console.log('Start the frontend with: cd zul && npm run dev');
});
