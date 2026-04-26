import { authenticate } from '../_lib/auth.js';
import { createSignedUploadUrl } from '../_lib/signed-url.js';
import { methodGuard, readJson } from '../_lib/http.js';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const auth = await authenticate(req, res);
  if (!auth) return;
  const { room, member } = auth;

  const { filename, mime_type, size_bytes } = readJson(req);

  if (size_bytes > 50 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large (max 50MB)' });
  }

  const ext = filename ? extname(filename).replace(/[^a-z0-9.]/gi, '') : '';
  const path = `media/${room.id}/${member.id}/${randomUUID()}${ext}`;
  const uploadData = await createSignedUploadUrl('media', path);
  res.json({ upload_url: uploadData.signedUrl, storage_path: path, token: uploadData.token });
}
