import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { transcribeFile } from '../_lib/whisper.js';
import { translate } from '../_lib/claude.js';
import { createSignedUrl } from '../_lib/signed-url.js';
import { methodGuard, readJson } from '../_lib/http.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { storage_path, duration_ms } = readJson(req);
  if (!storage_path) return res.status(400).json({ error: 'storage_path required' });

  const expectedPrefix = `voice_notes/${room.id}/${member.id}/`;
  if (!storage_path.startsWith(expectedPrefix)) {
    return res.status(403).json({ error: 'Forbidden path' });
  }

  const { data: others } = await supabaseAdmin
    .from('members').select('*').eq('room_id', room.id).neq('id', member.id);
  const other = others?.[0];

  if (duration_ms > 25 * 60 * 1000) {
    const { data: msg, error } = await supabaseAdmin
      .from('messages')
      .insert({
        room_id: room.id,
        sender_id: member.id,
        message_type: 'voice',
        source: 'mic_recording',
        voice_url: storage_path,
        voice_duration_ms: duration_ms,
        transcription_status: 'too_long',
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(msg);
  }

  const { data: pendingMsg, error: insertError } = await supabaseAdmin
    .from('messages')
    .insert({
      room_id: room.id,
      sender_id: member.id,
      message_type: 'voice',
      source: 'mic_recording',
      voice_url: storage_path,
      voice_duration_ms: duration_ms,
      transcription_status: 'pending',
    })
    .select().single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  // Return pending row immediately
  res.json(pendingMsg);

  // Transcribe + update asynchronously
  (async () => {
    let tmpPath;
    try {
      const signedUrl = await createSignedUrl('voice_notes', storage_path, 300);
      const audioRes = await fetch(signedUrl);
      const buf = await audioRes.arrayBuffer();
      tmpPath = join(tmpdir(), `${randomUUID()}.webm`);
      await writeFile(tmpPath, Buffer.from(buf));

      const { text: transcript, language: detectedLang } = await transcribeFile(tmpPath);

      let translated_text = null;
      let translated_language = null;
      let translation_confidence = null;

      if (transcript && other && other.language !== detectedLang) {
        const result = await translate(transcript, other.language);
        translated_text = result.translated;
        translated_language = other.language;
        translation_confidence = result.confidence;
      }

      await supabaseAdmin.from('messages').update({
        original_text: transcript,
        original_language: detectedLang,
        translated_text,
        translated_language,
        translation_confidence,
        translation_model: translated_text ? 'claude' : null,
        transcription_status: 'done',
      }).eq('id', pendingMsg.id);
    } catch {
      await supabaseAdmin.from('messages')
        .update({ transcription_status: 'failed' }).eq('id', pendingMsg.id);
    } finally {
      if (tmpPath) await unlink(tmpPath).catch(() => {});
    }
  })();
}
