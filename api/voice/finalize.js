import { createClient } from '@supabase/supabase-js';
import { translateWithDetection } from '../_lib/gemini.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_DURATION_MS = 25 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!clientId || !room_code || !secret_token)
    return res.status(400).json({ error: 'Missing required params' });

  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_code', room_code)
    .eq('secret_token', secret_token)
    .single();

  if (!room) return res.status(403).json({ error: 'Invalid room or token' });

  const { data: member } = await supabase
    .from('members')
    .select('id, language')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .single();

  if (!member) return res.status(403).json({ error: 'Not a member of this room' });

  const { voice_url, transcript, duration_ms } = req.body;

  if (!voice_url) return res.status(400).json({ error: 'voice_url required' });

  const { data: members } = await supabase
    .from('members')
    .select('language, client_id')
    .eq('room_id', room.id);

  const partner = members?.find((m) => m.client_id !== clientId);
  const partnerLang = partner?.language || 'en';

  let translated_text = null;

  if (transcript && (!duration_ms || duration_ms <= MAX_DURATION_MS)) {
    try {
      const result = await translateWithDetection(transcript, partnerLang);
      translated_text = result.translated;
    } catch (err) {
      console.error('Gemini translation error:', err);
    }
  }

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      room_id: room.id,
      sender_id: member.id,
      message_type: 'voice',
      source: 'mic_recording',
      voice_url,
      voice_duration_ms: duration_ms || null,
      original_text: transcript || null,
      translated_text,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json(msg);
}
