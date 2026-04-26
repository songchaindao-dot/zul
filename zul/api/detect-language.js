import { detectLanguage } from './_lib/claude.js';
import { methodGuard, readJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { text } = readJson(req);
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    res.json(await detectLanguage(text));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
