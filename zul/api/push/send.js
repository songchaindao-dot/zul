import { supabaseAdmin } from '../_lib/supabase.js';
import webpush from 'web-push';
import { methodGuard, readJson } from '../_lib/http.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@zul.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { member_id, title, body, data } = readJson(req);
  if (!member_id || !title) return res.status(400).json({ error: 'member_id and title required' });

  const { data: member } = await supabaseAdmin
    .from('members').select('push_subscription').eq('id', member_id).single();

  if (!member?.push_subscription) {
    return res.json({ success: false, reason: 'no subscription' });
  }

  try {
    await webpush.sendNotification(member.push_subscription, JSON.stringify({ title, body, data }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
