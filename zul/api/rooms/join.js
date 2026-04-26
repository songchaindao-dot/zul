import { supabaseAdmin } from '../_lib/supabase.js';
import { methodGuard, readJson } from '../_lib/http.js';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch { return false; }
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { room_code, secret_token, client_id, display_name, language, avatar_emoji } = readJson(req);

  if (!room_code || !secret_token || !client_id || !display_name || !language) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('room_code', room_code)
    .single();

  if (roomError || !room) return res.status(404).json({ error: 'Room not found' });
  if (!safeEqual(secret_token, room.secret_token)) return res.status(401).json({ error: 'Invalid token' });

  const { data: existing } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('room_id', room.id)
    .eq('client_id', client_id)
    .single();

  let member;
  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from('members')
      .update({
        display_name,
        language,
        avatar_emoji: avatar_emoji || existing.avatar_emoji,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    member = updated;
  } else {
    const { count } = await supabaseAdmin
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (count >= (room.max_members || 2)) {
      return res.status(403).json({ error: 'Room is full' });
    }

    const { data: newMember, error } = await supabaseAdmin
      .from('members')
      .insert({
        room_id: room.id,
        client_id,
        display_name,
        language,
        avatar_emoji: avatar_emoji || '💬',
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    member = newMember;
  }

  const { data: allMembers } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('room_id', room.id);

  const other_members = (allMembers || []).filter(m => m.id !== member.id);
  res.json({ room, member, other_members });
}
