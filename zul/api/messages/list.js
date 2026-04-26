import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { createSignedUrl } from '../_lib/signed-url.js';
import { translate } from '../_lib/gemini.js';
import { methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

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

  const viewerLanguage = member.language || 'en';
  const needsBackfill = (messages || []).filter((msg) =>
    msg.sender_id !== member.id &&
    msg.original_text &&
    msg.source !== 'file_upload' &&
    (!msg.translated_text || msg.translated_language !== viewerLanguage)
  );

  for (const msg of needsBackfill) {
    try {
      const result = await translate(msg.original_text, viewerLanguage);
      await supabaseAdmin
        .from('messages')
        .update({
          translated_text: result.translated,
          translated_language: viewerLanguage,
          translation_confidence: result.confidence,
          translation_model: 'gemini_backfill',
        })
        .eq('id', msg.id);

      msg.translated_text = result.translated;
      msg.translated_language = viewerLanguage;
      msg.translation_confidence = result.confidence;
      msg.translation_model = 'gemini_backfill';
    } catch {
      // Return original content even if backfill translation fails.
    }
  }

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
