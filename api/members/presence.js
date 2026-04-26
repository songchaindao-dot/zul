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

  const clientId = req.headers['x-zul-client-id'] || req.query.client;
  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!clientId || !room_code || !secret_token) {
    return res.status(400).json({ error: 'Missing required params' });
  }

  const ctx = await validateRoom(room_code, secret_token, clientId);
  if (!ctx) return res.status(403).json({ error: 'Unauthorized' });

  const { status } = req.body || {};
  const validStatus = ['online', 'offline'].includes(status) ? status : 'online';

  const { data, error } = await supabase
    .from('members')
    .update({ status: validStatus, last_seen: new Date().toISOString() })
    .eq('id', ctx.member_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}
