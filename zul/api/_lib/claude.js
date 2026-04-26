import Anthropic from '@anthropic-ai/sdk';

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function detectLanguage(text) {
  if (!client || !text?.trim()) return { language: 'en', name: 'English', confidence: 0 };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Detect the language of this text and respond with ONLY a JSON object like {"language":"es","name":"Spanish","confidence":0.99}. Text: "${text.slice(0, 500)}"`,
    }],
  });

  try {
    return JSON.parse(response.content[0].text.trim());
  } catch {
    return { language: 'en', name: 'English', confidence: 0 };
  }
}

export async function translate(text, targetLanguage) {
  if (!client || !text?.trim()) return { translated: text, confidence: 0 };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Translate the following text to ${targetLanguage}. Respond with ONLY a JSON object like {"translated":"...","confidence":0.99}. Preserve tone, formatting, and emoji exactly. Text: "${text}"`,
    }],
  });

  try {
    return JSON.parse(response.content[0].text.trim());
  } catch {
    return { translated: text, confidence: 0 };
  }
}
