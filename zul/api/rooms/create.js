import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../_lib/supabase.js';
import { methodGuard, readJson } from '../_lib/http.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(len) {
  let result = '';
  while (result.length < len) {
    const byte = randomBytes(1)[0];
    if (byte < ALPHABET.length * Math.floor(256 / ALPHABET.length)) {
      result += ALPHABET[byte % ALPHABET.length];
    }
  }
  return result;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { display_name, language, avatar_emoji } = readJson(req);

  if (!display_name || !language) {
    return res.status(400).json({ error: 'display_name and language required' });
  }

  const room_code = generateCode(6);
  const secret_token = randomBytes(24).toString('base64url');
  const client_id = randomBytes(16).toString('hex');

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .insert({ room_code, secret_token })
    .select()
    .single();

  if (roomError) return res.status(500).json({ error: roomError.message });

  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .insert({
      room_id: room.id,
      client_id,
      display_name,
      language,
      avatar_emoji: avatar_emoji || '💕',
      status: 'online',
      last_seen: new Date().toISOString(),
    })
    .select()
    .single();

  if (memberError) return res.status(500).json({ error: memberError.message });

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  const appUrl = process.env.APP_URL || `${proto}://${host}`;
  const share_url = `${appUrl}/r/${room_code}?t=${secret_token}`;

  res.json({ room_code, secret_token, client_id, member_id: member.id, share_url });
}
