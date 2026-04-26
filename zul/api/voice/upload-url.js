import { authenticate } from '../_lib/auth.js';
import { createSignedUploadUrl } from '../_lib/signed-url.js';
import { methodGuard, readJson } from '../_lib/http.js';
import { randomUUID } from 'node:crypto';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { filename, mime_type } = readJson(req);
  if (!mime_type?.startsWith('audio/')) {
    return res.status(400).json({ error: 'mime_type must be audio/*' });
  }

  const ext = (filename?.split('.').pop() || 'webm').replace(/[^a-z0-9]/gi, '');
  const path = `voice_notes/${room.id}/${member.id}/${randomUUID()}.${ext}`;
  const uploadData = await createSignedUploadUrl('voice_notes', path);
  res.json({ upload_url: uploadData.signedUrl, storage_path: path, token: uploadData.token });
}
