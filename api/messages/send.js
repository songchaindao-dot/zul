import { createClient } from '@supabase/supabase-js';
import { translateWithDetection } from '../_lib/gemini.js';
import { sendPush } from '../_lib/push.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateRoom(room_code, secret_token, client_id) {
  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_code', room_code)
    .eq('secret_token', secret_token)
    .single();
  if (!room) return null;

  const { data: member } = await supabase
    .from('members')
    .select('id, language')
    .eq('room_id', room.id)
    .eq('client_id', client_id)
    .single();
  if (!member) return null;

  return { room_id: room.id, sender_id: member.id, sender_language: member.language };
}

function resolveMessageType(source, media_mime_type) {
  if (source === 'mic_recording') return 'voice';
  if (!media_mime_type) return 'text';
  if (media_mime_type.startsWith('image/')) return 'photo';
  if (media_mime_type.startsWith('video/')) return 'video';
  return 'file';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!clientId || !room_code || !secret_token)
    return res.status(400).json({ error: 'Missing required params' });

  const ctx = await validateRoom(room_code, secret_token, clientId);
  if (!ctx) return res.status(403).json({ error: 'Unauthorized' });

  const { text, media_url, media_type, media_name, source, original_language } = req.body;

  if (!text && !media_url) return res.status(400).json({ error: 'text or media_url required' });

  // Find partner language for translation
  const { data: members } = await supabase
    .from('members')
    .select('language, client_id, push_subscription')
    .eq('room_id', ctx.room_id);

  const partnerMember = members?.find((m) => m.client_id !== clientId);
  const partnerLang = partnerMember?.language || 'en';

  let translated_text = null;
  let detected_language = original_language || ctx.sender_language || null;
  let translation_model = null;
  const normalizedSourceLanguage = (detected_language || ctx.sender_language || '').toLowerCase();
  const normalizedPartnerLanguage = (partnerLang || '').toLowerCase();
  const crossLanguage = Boolean(partnerMember && normalizedPartnerLanguage && normalizedPartnerLanguage !== normalizedSourceLanguage);

  if (text && source !== 'file_upload') {
    try {
      const result = await translateWithDetection(text, partnerLang);
      translated_text = result.translated;
      detected_language = result.detected_language || detected_language;
      if (translated_text) {
        translation_model = 'gemini';
      }

      const unchangedAcrossLanguages =
        crossLanguage &&
        translated_text &&
        translated_text.trim().toLowerCase() === text.trim().toLowerCase();

      if (unchangedAcrossLanguages) {
        return res.status(502).json({
          error: 'Translation failed',
          detail: 'Translation output was unchanged for a cross-language message',
        });
      }
    } catch (err) {
      if (crossLanguage) {
        return res.status(502).json({
          error: 'Translation failed',
          detail: err?.message || 'Gemini translation error',
        });
      }
    }
  }

  const resolvedSource = source && ['mic_recording', 'file_upload', 'camera', 'imported'].includes(source)
    ? source : null;

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      room_id: ctx.room_id,
      sender_id: ctx.sender_id,
      message_type: resolveMessageType(resolvedSource, media_type),
      original_text: text || null,
      original_language: detected_language,
      translated_text,
      translated_language: partnerLang,
      translation_model,
      source: resolvedSource,
      media_url: media_url || null,
      media_mime_type: media_type || null,
      media_filename: media_name || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json(msg);

  // Non-blocking push notification to partner
  if (partnerMember?.push_subscription && text) {
    sendPush(partnerMember.push_subscription, {
      title: 'Zul 💕',
      body: text.slice(0, 120),
      data: { url: `/?room=${room_code}&t=${secret_token}` },
    }).catch(() => {});
  }
}
