import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  if (!clientId) return res.status(400).json({ error: 'Missing X-Zul-Client-Id header' });

  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!room_code || !secret_token) return res.status(400).json({ error: 'room and t params required' });

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, room_code, secret_token')
    .eq('room_code', room_code)
    .eq('secret_token', secret_token)
    .single();

  if (roomErr || !room) return res.status(403).json({ error: 'Invalid room or token' });

  const { display_name, language, emoji_avatar } = req.body;
  if (!display_name) return res.status(400).json({ error: 'display_name required' });

  // Returning user — update profile + presence
  const { data: existing } = await supabase
    .from('members')
    .select('*')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .single();

  if (existing) {
    const { data: updated } = await supabase
      .from('members')
      .update({
        display_name,
        language,
        avatar_emoji: emoji_avatar || existing.avatar_emoji,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    return res.json({ member: updated, room_id: room.id, room_code });
  }

  // Check room capacity (max 2)
  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if (count >= 2) return res.status(403).json({ error: 'Room is full' });

  const { data: member, error: memberErr } = await supabase
    .from('members')
    .insert({
      room_id: room.id,
      client_id: clientId,
      display_name,
      language: language || 'en',
      avatar_emoji: emoji_avatar || '💕',
      status: 'online',
    })
    .select()
    .single();

  if (memberErr) return res.status(500).json({ error: memberErr.message });

  res.json({ member, room_id: room.id, room_code });
}
