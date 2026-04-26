import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { detectLanguage, translate } from '../_lib/claude.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const {
    storage_path, mime_type, size_bytes, filename,
    width, height, duration_ms, thumbnail_path, caption, source,
  } = readJson(req);

  if (!['file_upload', 'camera'].includes(source)) {
    return res.status(400).json({ error: 'source must be file_upload or camera' });
  }
  if (!storage_path) return res.status(400).json({ error: 'storage_path required' });

  let message_type;
  if (mime_type?.startsWith('image/')) message_type = 'photo';
  else if (mime_type?.startsWith('video/')) message_type = 'video';
  else message_type = 'file';

  const { data: others } = await supabaseAdmin
    .from('members').select('*').eq('room_id', room.id).neq('id', member.id);
  const other = others?.[0];

  let caption_language = null;
  let translated_caption = null;

  if (caption?.trim()) {
    try {
      const detected = await detectLanguage(caption);
      caption_language = detected.language;
      if (other && other.language !== caption_language) {
        const result = await translate(caption, other.language);
        translated_caption = result.translated;
      }
    } catch {}
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      room_id: room.id,
      sender_id: member.id,
      message_type,
      source,
      media_url: storage_path,
      media_mime_type: mime_type,
      media_size_bytes: size_bytes,
      media_filename: filename,
      media_width: width,
      media_height: height,
      media_duration_ms: duration_ms,
      thumbnail_url: thumbnail_path,
      original_text: caption || null,
      original_language: caption_language,
      translated_text: translated_caption,
      translated_language: translated_caption ? other?.language : null,
      transcription_status: 'none',
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(message);
}
