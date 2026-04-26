import { getLanguageName } from '../lib/languages.js';

export default function TypingIndicator({ typingEvent, memberName }) {
  if (!typingEvent) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {memberName || 'Someone'} is typing
        {typingEvent.detected_language && (
          <span className="text-slate-500"> in {getLanguageName(typingEvent.detected_language)}</span>
        )}
      </span>
    </div>
  );
}
