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

  const { is_typing, detected_language } = req.body || {};

  const cutoff = new Date(Date.now() - 30000).toISOString();
  await supabase.from('typing_events').delete().lt('created_at', cutoff);

  if (is_typing) {
    await supabase.from('typing_events').upsert(
      {
        room_id: ctx.room_id,
        member_id: ctx.member_id,
        detected_language: detected_language || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,member_id' }
    );
  } else {
    await supabase
      .from('typing_events')
      .delete()
      .eq('room_id', ctx.room_id)
      .eq('member_id', ctx.member_id);
  }

  return res.json({ success: true });
}
