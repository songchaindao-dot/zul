import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

function requireClient() {
  if (!genAI) throw new Error('GEMINI_API_KEY is not configured');
  return genAI;
}

async function generateWithFallback(prompt) {
  const client = requireClient();
  let lastErr = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
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
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
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

export async function translate(text, targetLanguage) {
  const prompt = `Translate this text to target language "${targetLanguage}".
Preserve tone, intent, punctuation, slang, and emoji.
Output MUST be in "${targetLanguage}" and MUST NOT simply copy source wording unless it is a proper noun, URL, brand name, or emoji.
Return ONLY the translated text. No markdown, no JSON, no explanation.

Text:
${text}`;

  const translated = (await generateWithFallback(prompt)).trim();
  if (!translated) throw new Error('Translation output was empty');
  return { translated, confidence: 0 };
}
