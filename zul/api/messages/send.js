import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { detectLanguage, translate } from '../_lib/claude.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { text } = readJson(req);
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  const { data: others } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('room_id', room.id)
    .neq('id', member.id);

  const other = others?.[0];
  let original_language = 'en';
  let translated_text = null;
  let translated_language = null;
  let translation_confidence = null;
  let translation_model = null;

  try {
    const detected = await detectLanguage(text);
    original_language = detected.language;

    if (other && other.language !== original_language) {
      const result = await translate(text, other.language);
      translated_text = result.translated;
      translated_language = other.language;
      translation_confidence = result.confidence;
      translation_model = 'claude';
    }
  } catch { /* insert anyway */ }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      room_id: room.id,
      sender_id: member.id,
      message_type: 'text',
      original_text: text,
      original_language,
      translated_text,
      translated_language,
      translation_confidence,
      translation_model,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(message);
}
