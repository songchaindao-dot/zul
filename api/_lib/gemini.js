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

export async function translateText(text, targetLanguage) {
  const prompt = `Translate the following text to language code "${targetLanguage}". Keep meaning, tone, and intent. Return ONLY the translated text (no markdown, no quotes, no explanation).\n\nText:\n${text}`;
  return generateWithFallback(prompt);
}

export async function detectLanguage(text) {
  const prompt = `Detect the language of this text and return ONLY JSON:\n{"language":"es","name":"Spanish","confidence":0.99}\nNo markdown.\n\nText:\n${text}`;
  const raw = await generateWithFallback(prompt);
  const parsed = parseJsonLoose(raw);
  if (parsed?.language) return parsed;
  return { language: 'unknown', name: 'Unknown', confidence: 0 };
}

export async function translateWithDetection(text, targetLanguage) {
  const prompt = `Detect source language and translate to "${targetLanguage}". Keep meaning, tone, and intent. Return ONLY JSON:\n{"detected_language":"es","detected_name":"Spanish","translated":"Hello world","confidence":0.99}\nNo markdown.\n\nText:\n${text}`;

  try {
    const raw = await generateWithFallback(prompt);
    const parsed = parseJsonLoose(raw);
    if (parsed?.translated && String(parsed.translated).trim()) {
      return {
        detected_language: parsed.detected_language || 'unknown',
        detected_name: parsed.detected_name || 'Unknown',
        translated: String(parsed.translated).trim(),
        confidence: Number(parsed.confidence || 0),
      };
    }
  } catch {
    // Fall through to two-step fallback.
  }

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
