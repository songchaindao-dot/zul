import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { member } = auth;

  const { status } = readJson(req);
  const validStatus = ['online', 'offline'].includes(status) ? status : 'online';

  const { data, error } = await supabaseAdmin
    .from('members')
    .update({ status: validStatus, last_seen: new Date().toISOString() })
    .eq('id', member.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
