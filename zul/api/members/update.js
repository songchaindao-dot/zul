import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['PATCH'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { member } = auth;

  const { display_name, language, avatar_emoji } = readJson(req);
  const updates = {};
  if (display_name) updates.display_name = display_name;
  if (language) updates.language = language;
  if (avatar_emoji) updates.avatar_emoji = avatar_emoji;

  const { data, error } = await supabaseAdmin
    .from('members').update(updates).eq('id', member.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
