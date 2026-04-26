import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  try {
    jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const storage_path = `voice-notes/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${filename}`;

  const { data, error } = await supabase.storage
    .from('chat_media')
    .createSignedUploadUrl(storage_path);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ upload_url: data.signedUrl, storage_path });
}
