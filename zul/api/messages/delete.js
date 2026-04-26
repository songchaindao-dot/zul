import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['DELETE'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { message_id } = readJson(req);
  if (!message_id) return res.status(400).json({ error: 'message_id required' });

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('sender_id')
    .eq('id', message_id)
    .eq('room_id', room.id)
    .single();

  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.sender_id !== member.id) return res.status(403).json({ error: 'Not your message' });

  const { error } = await supabaseAdmin
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', message_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
