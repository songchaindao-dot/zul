import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

async function generateWithFallback(prompt) {
  let lastErr = null;
  for (const name of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.();
      if (text && text.trim()) return text.trim();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Gemini generation failed');
}

function parseJsonLoose(raw) {
  const cleaned = (raw || '').replace(/```json\s*|\s*```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function translateOnce(text, targetLanguage, strict = false) {
  const strictLine = strict
    ? `Output MUST be fully in target language "${targetLanguage}" and MUST NOT repeat source wording unless it is a proper noun, URL, brand name, or emoji.`
    : '';
  const prompt = `Translate the following text to target language "${targetLanguage}".
Preserve meaning, tone, punctuation, and emoji.
${strictLine}
Return ONLY the translated text (no markdown, no quotes, no explanation).

Text:
${text}`;
  return generateWithFallback(prompt);
}

export async function translateText(text, targetLanguage) {
  const first = (await translateOnce(text, targetLanguage, false)).trim();
  if (first) return first;
  return (await translateOnce(text, targetLanguage, true)).trim();
}

export async function detectLanguage(text) {
  const prompt = `Detect the language of this text.
Return ONLY the ISO-639-1 language code in lowercase (example: en, es, fr, pt, ar).
No markdown, no JSON, no explanation.

Text:
${text}`;
  const raw = await generateWithFallback(prompt);
  const code = String(raw || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (code.length >= 2 && code.length <= 8) {
    return { language: code, name: 'Unknown', confidence: 0 };
  }
  const parsed = parseJsonLoose(raw);
  if (parsed?.language) return parsed;
  return { language: 'unknown', name: 'Unknown', confidence: 0 };
}

export async function translateWithDetection(text, targetLanguage) {
  try {
    const [detected, translated] = await Promise.all([
      detectLanguage(text),
      translateText(text, targetLanguage),
    ]);
    return {
      detected_language: detected.language || 'unknown',
      detected_name: detected.name || 'Unknown',
      translated: translated ? String(translated).trim() : '',
      confidence: Number(detected.confidence || 0),
    };
  } catch {
    throw new Error('Gemini translation failed after fallback');
  }
}
