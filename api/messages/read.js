import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateRoom(room_code, secret_token, client_id) {
  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_code', room_code)
    .eq('secret_token', secret_token)
    .single();
  if (!room) return null;

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('room_id', room.id)
    .eq('client_id', client_id)
    .single();
  if (!member) return null;

  return { room_id: room.id, member_id: member.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!clientId || !room_code || !secret_token) {
    return res.status(400).json({ error: 'Missing required params' });
  }

  const ctx = await validateRoom(room_code, secret_token, clientId);
  if (!ctx) return res.status(403).json({ error: 'Unauthorized' });

  const { message_ids } = req.body || {};
  if (!Array.isArray(message_ids) || !message_ids.length) {
    return res.status(400).json({ error: 'message_ids array required' });
  }

  const { data: messages, error: fetchError } = await supabase
    .from('messages')
    .select('id, sender_id, read_by, read_at')
    .in('id', message_ids)
    .eq('room_id', ctx.room_id);

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  for (const msg of messages || []) {
    if (msg.sender_id === ctx.member_id) continue;
    const read_by = Array.isArray(msg.read_by) ? [...msg.read_by] : [];
    if (!read_by.includes(ctx.member_id)) {
      read_by.push(ctx.member_id);
      await supabase
        .from('messages')
        .update({ read_by, read_at: msg.read_at || new Date().toISOString() })
        .eq('id', msg.id);
    }
  }

  return res.json({ success: true });
}
