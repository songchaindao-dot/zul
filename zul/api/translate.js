import { detectLanguage, translate } from './_lib/claude.js';
import { methodGuard, readJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { text, target_language } = readJson(req);
  if (!text || !target_language) {
    return res.status(400).json({ error: 'text and target_language required' });
  }
  try {
    const [detected, result] = await Promise.all([
      detectLanguage(text),
      translate(text, target_language),
    ]);
    res.json({ translated: result.translated, detected_language: detected.language, confidence: result.confidence });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
