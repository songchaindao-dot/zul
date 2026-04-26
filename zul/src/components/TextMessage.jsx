import { useState } from 'react';

export default function TextMessage({ message, isMine }) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (message.deleted_at) {
    return <p className="text-slate-500 italic text-sm">🗑️ This message was deleted</p>;
  }

  const primary = isMine ? message.original_text : (message.translated_text || message.original_text);
  const secondary = isMine ? message.translated_text : (message.translated_text ? message.original_text : null);

  return (
    <div>
      <p className="text-rose-50 text-sm leading-relaxed whitespace-pre-wrap break-words">{primary}</p>
      {secondary && (
        <button
          onClick={() => setShowOriginal(v => !v)}
          className="mt-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showOriginal ? '▲ hide original' : '▼ see original'}
        </button>
      )}
      {secondary && showOriginal && (
        <p className="mt-1 text-xs text-slate-400 italic">{secondary}</p>
      )}
      {message.edited_at && (
        <span className="text-xs text-slate-500 ml-1">edited</span>
      )}
    </div>
  );
}
