import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  if (!clientId) return res.status(400).json({ error: 'Missing X-Zul-Client-Id header' });

  // Generate unique room code
  let room_code;
  let attempts = 0;
  do {
    room_code = generateRoomCode();
    const { data } = await supabase.from('rooms').select('id').eq('room_code', room_code).single();
    if (!data) break;
    attempts++;
  } while (attempts < 10);

  const secret_token = crypto.randomUUID();

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ room_code, secret_token })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ room_code: room.room_code, secret_token: room.secret_token, room_id: room.id });
}
