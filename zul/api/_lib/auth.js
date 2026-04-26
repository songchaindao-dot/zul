import { supabaseAdmin } from './supabase.js';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function authenticate(req, res) {
  const roomCode = req.query?.room;
  const secretToken = req.query?.t;
  const clientId = req.headers?.['x-zul-client-id'] || req.query?.client;

  if (!roomCode || !secretToken || !clientId) {
    res.status(401).json({ error: 'Missing auth parameters' });
    return null;
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (roomError || !room) {
    res.status(401).json({ error: 'Room not found' });
    return null;
  }

  if (!safeEqual(secretToken, room.secret_token)) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .single();

  if (memberError || !member) {
    res.status(401).json({ error: 'Member not found' });
    return null;
  }

  return { room, member };
}
