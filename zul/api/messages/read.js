import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { message_ids } = readJson(req);
  if (!Array.isArray(message_ids) || !message_ids.length) {
    return res.status(400).json({ error: 'message_ids array required' });
  }

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, read_by, read_at')
    .in('id', message_ids)
    .eq('room_id', room.id);

  for (const msg of messages || []) {
    if (msg.sender_id === member.id) continue;
    const read_by = [...(msg.read_by || [])];
    if (!read_by.includes(member.id)) {
      read_by.push(member.id);
      await supabaseAdmin
        .from('messages')
        .update({ read_by, read_at: msg.read_at || new Date().toISOString() })
        .eq('id', msg.id);
    }
  }

  res.json({ success: true });
}
