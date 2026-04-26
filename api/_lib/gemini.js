import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function translateText(text, targetLanguage) {
  const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text — no quotes, no explanations, no markdown.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function detectLanguage(text) {
  const prompt = `Detect the language of this text. Return ONLY a JSON object exactly like {"language":"es","name":"Spanish","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  try { return JSON.parse(raw); }
  catch { return { language: 'unknown', name: 'Unknown', confidence: 0 }; }
}

export async function translateWithDetection(text, targetLanguage) {
  const prompt = `Detect this text's language and translate it to ${targetLanguage}. Return ONLY a JSON object exactly like {"detected_language":"es","detected_name":"Spanish","translated":"Hello world","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  try { return JSON.parse(raw); }
  catch { return { detected_language: 'unknown', detected_name: 'Unknown', translated: text, confidence: 0 }; }
}
