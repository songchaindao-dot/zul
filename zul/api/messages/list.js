import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { createSignedUrl } from '../_lib/signed-url.js';
import { methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room } = auth;

  const limit = Math.min(parseInt(req.query?.limit) || 50, 100);
  const before = req.query?.before;

  let query = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data: messages, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const enriched = await Promise.all((messages || []).map(async (msg) => {
    if (msg.voice_url) {
      try { msg.voice_signed_url = await createSignedUrl('voice_notes', msg.voice_url); } catch {}
    }
    if (msg.media_url) {
      try { msg.media_signed_url = await createSignedUrl('media', msg.media_url); } catch {}
    }
    if (msg.thumbnail_url) {
      try { msg.thumbnail_signed_url = await createSignedUrl('media', msg.thumbnail_url); } catch {}
    }
    return msg;
  }));

  res.json(enriched.reverse());
}
