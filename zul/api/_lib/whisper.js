import fs from 'node:fs';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function transcribeFile(filePath) {
  if (!openai) {
    return { text: null, language: null };
  }

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: fs.createReadStream(filePath),
    response_format: 'verbose_json',
  });

  return {
    text: response.text || null,
    language: response.language || null,
  };
}
