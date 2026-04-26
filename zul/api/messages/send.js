import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { translateWithDetection } from '../_lib/gemini.js';
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
    .select('id, language')
    .eq('room_id', room.id)
    .neq('id', member.id);

  const other = others?.[0];
  let original_language = 'en';
  let translated_text = null;
  let translated_language = null;
  let translation_confidence = null;
  let translation_model = null;

  const normalizedMemberLang = (member.language || 'en').toLowerCase();
  const normalizedOtherLang = (other?.language || 'en').toLowerCase();
  const crossLanguage = Boolean(other && normalizedOtherLang && normalizedOtherLang !== normalizedMemberLang);

  if (text && other) {
    try {
      const result = await translateWithDetection(text, other.language);
      original_language = result.detected_language || 'en';
      translated_text = result.translated;
      translated_language = other.language;
      translation_confidence = result.confidence;
      translation_model = 'gemini';

      // Validate that translation actually changed the text for cross-language conversations
      const unchangedAcrossLanguages =
        crossLanguage &&
        translated_text &&
        translated_text.trim().toLowerCase() === text.trim().toLowerCase();

      if (unchangedAcrossLanguages) {
        console.warn('Translation unchanged for cross-language message:', { text, translated: translated_text });
        // Don't block, but log it as a warning - translation may have failed silently
        translated_text = null;
        translation_model = null;
      }
    } catch (err) {
      console.error('Translation/detection failed:', err?.message);
      // Don't block message sending, but translation will be null
      translated_text = null;
      translation_model = null;
    }
  }

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
