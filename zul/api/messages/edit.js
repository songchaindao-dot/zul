import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { detectLanguage, translate } from '../_lib/claude.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['PATCH'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { message_id, new_text } = readJson(req);
  if (!message_id || !new_text?.trim()) {
    return res.status(400).json({ error: 'message_id and new_text required' });
  }

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('id', message_id)
    .eq('room_id', room.id)
    .single();

  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.sender_id !== member.id) return res.status(403).json({ error: 'Not your message' });

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  if (msg.created_at < fifteenMinAgo) {
    return res.status(403).json({ error: 'Edit window (15 min) has expired' });
  }

  const historyEntry = { at: new Date().toISOString(), original_text: msg.original_text, translated_text: msg.translated_text };
  const edit_history = [...(msg.edit_history || []), historyEntry];

  const { data: others } = await supabaseAdmin
    .from('members').select('*').eq('room_id', room.id).neq('id', member.id);
  const other = others?.[0];

  let original_language = 'en';
  let translated_text = null;
  let translated_language = null;
  let translation_confidence = null;

  try {
    const detected = await detectLanguage(new_text);
    original_language = detected.language;
    if (other && other.language !== original_language) {
      const result = await translate(new_text, other.language);
      translated_text = result.translated;
      translated_language = other.language;
      translation_confidence = result.confidence;
    }
  } catch {}

  const { data: updated, error } = await supabaseAdmin
    .from('messages')
    .update({
      original_text: new_text,
      original_language,
      translated_text,
      translated_language,
      translation_confidence,
      translation_model: translated_text ? 'claude' : null,
      edit_history,
      edited_at: new Date().toISOString(),
      edit_count: (msg.edit_count || 0) + 1,
    })
    .eq('id', message_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(updated);
}
