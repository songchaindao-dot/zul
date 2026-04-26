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
      <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-inherit">{primary}</p>
      {secondary && (
        <button
          onClick={() => setShowOriginal(v => !v)}
          className="mt-1 text-xs text-violet-200/80 transition-colors hover:text-violet-100"
        >
          {showOriginal ? '▲ hide original' : '▼ see original'}
        </button>
      )}
      {secondary && showOriginal && (
        <p className="mt-1 text-xs italic text-white/70">{secondary}</p>
      )}
      {message.edited_at && (
        <span className="ml-1 text-[11px] text-white/50">edited</span>
      )}
    </div>
  );
}
