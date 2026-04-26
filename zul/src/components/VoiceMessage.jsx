import { useState } from 'react';
import { formatDuration } from '../lib/format.js';
import { download } from '../lib/download.js';

const STATUS_LABELS = {
  pending: '⏳ Transcribing…',
  failed: '⚠️ Transcription failed',
  too_long: '⚠️ Too long to transcribe',
  none: '',
  done: '',
};

export default function VoiceMessage({ message, isMine }) {
  const [showOriginal, setShowOriginal] = useState(false);

  const url = message.voice_signed_url;
  const status = message.transcription_status;
  const transcript = isMine ? message.original_text : (message.translated_text || message.original_text);
  const originalTranscript = isMine ? null : message.original_text;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-pink-400">🎤</span>
        {url ? (
          <audio
            controls
            src={url}
            className="max-w-[200px] h-8"
            style={{ colorScheme: 'dark' }}
          />
        ) : (
          <span className="text-slate-500 text-xs">Loading audio…</span>
        )}
        <span className="text-xs text-slate-500">{formatDuration(message.voice_duration_ms)}</span>
        {url && (
          <button
            onClick={() => download(url, `voice-${message.id}.webm`)}
            className="text-slate-400 hover:text-pink-400 text-xs transition-colors"
            title="Download"
          >⬇</button>
        )}
      </div>

      {status === 'pending' && (
        <p className="text-xs text-slate-400 animate-pulse">⏳ Transcribing…</p>
      )}
      {status && status !== 'pending' && status !== 'done' && STATUS_LABELS[status] && (
        <p className="text-xs text-slate-500">{STATUS_LABELS[status]}</p>
      )}
      {transcript && (
        <div>
          <p className="text-sm text-rose-50 italic">"{transcript}"</p>
          {originalTranscript && originalTranscript !== transcript && (
            <button
              onClick={() => setShowOriginal(v => !v)}
              className="mt-0.5 text-xs text-purple-400 hover:text-purple-300"
            >
              {showOriginal ? '▲ hide original' : '▼ see original'}
            </button>
          )}
          {originalTranscript && showOriginal && (
            <p className="text-xs text-slate-400 italic mt-0.5">"{originalTranscript}"</p>
          )}
        </div>
      )}
    </div>
  );
}
