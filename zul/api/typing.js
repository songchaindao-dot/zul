import { supabaseAdmin } from './_lib/supabase.js';
import { authenticate } from './_lib/auth.js';
import { methodGuard, readJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { is_typing, detected_language } = readJson(req);

  // Prune stale events
  const cutoff = new Date(Date.now() - 30000).toISOString();
  await supabaseAdmin.from('typing_events').delete().lt('created_at', cutoff);

  if (is_typing) {
    await supabaseAdmin.from('typing_events').upsert({
      room_id: room.id,
      member_id: member.id,
      detected_language: detected_language || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'room_id,member_id' });
  } else {
    await supabaseAdmin.from('typing_events')
      .delete().eq('room_id', room.id).eq('member_id', member.id);
  }

  res.json({ success: true });
}
