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
  const prompt = `Detect the language of this text and return ONLY JSON:
{"language":"es","name":"Spanish","confidence":0.99}
No markdown.

Text:
${text}`;

  const raw = await generateWithFallback(prompt);
  const parsed = parseJsonLoose(raw);
  if (parsed?.language) return parsed;
  return { language: 'unknown', name: 'Unknown', confidence: 0 };
}

export async function translate(text, targetLanguage) {
  const prompt = `Translate this text to language code "${targetLanguage}". Preserve tone, intent, punctuation, slang, and emoji. Return ONLY JSON:
{"translated":"...","confidence":0.99}
No markdown.

Text:
${text}`;

  const raw = await generateWithFallback(prompt);
  const parsed = parseJsonLoose(raw);
  if (parsed?.translated) {
    return {
      translated: parsed.translated,
      confidence: Number(parsed.confidence || 0),
    };
  }

  throw new Error('Translation JSON parsing failed');
}
