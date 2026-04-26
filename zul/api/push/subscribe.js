import { supabaseAdmin } from '../_lib/supabase.js';
import { authenticate } from '../_lib/auth.js';
import { methodGuard, readJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { member } = auth;

  const { subscription } = readJson(req);
  if (!subscription) return res.status(400).json({ error: 'subscription required' });

  const { error } = await supabaseAdmin
    .from('members').update({ push_subscription: subscription }).eq('id', member.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
