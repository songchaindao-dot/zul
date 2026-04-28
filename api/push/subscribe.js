import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = req.headers['x-zul-client-id'];
  const room_code = req.query.room;
  const secret_token = req.query.t;

  if (!clientId || !room_code || !secret_token)
    return res.status(400).json({ error: 'Missing params' });

  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'subscription required' });

  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_code', room_code)
    .eq('secret_token', secret_token)
    .single();

  if (!room) return res.status(403).json({ error: 'Unauthorized' });

  const { error } = await supabase
    .from('members')
    .update({ push_subscription: subscription })
    .eq('room_id', room.id)
    .eq('client_id', clientId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
