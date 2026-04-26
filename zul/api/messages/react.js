import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { message_id, emoji } = readJson(req);
  if (!message_id || !emoji) return res.status(400).json({ error: 'message_id and emoji required' });

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('reactions')
    .eq('id', message_id)
    .eq('room_id', room.id)
    .single();

  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const entry = `${member.id}:${emoji}`;
  const reactions = [...(msg.reactions || [])];
  const idx = reactions.indexOf(entry);
  if (idx >= 0) reactions.splice(idx, 1);
  else reactions.push(entry);

  const { data: updated, error } = await supabaseAdmin
    .from('messages')
    .update({ reactions })
    .eq('id', message_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(updated);
}
