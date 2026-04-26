import { getLanguageName } from '../lib/languages.js';

export default function TypingIndicator({ typingEvent, memberName }) {
  if (!typingEvent) return null;

  return (
    <div className="relative z-10 px-3 pb-1">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#171225]/88 px-3 py-1.5 text-xs text-violet-100/70 backdrop-blur-sm">
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: '300ms' }} />
        </div>
        <span>
          {memberName || 'Someone'} is typing
          {typingEvent.detected_language && (
            <span className="text-violet-200/55"> in {getLanguageName(typingEvent.detected_language)}</span>
          )}
        </span>
      </div>
    </div>
  );
}
