import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList({ messages, member, otherMember, onEdit, onDelete }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center px-8 text-center text-sm text-violet-100/70">
        <div className="max-w-xs rounded-[28px] border border-white/10 bg-[#11091b]/80 px-6 py-7 shadow-[0_18px_45px_rgba(8,2,18,0.35)] backdrop-blur-sm">
          <div className="mb-3 text-4xl">💕</div>
          <p className="font-medium text-white">Start your Zul conversation.</p>
          <p className="mt-1 text-xs text-violet-200/60">Messages stay mobile-first, private, and translated automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-1">
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isMine={msg.sender_id === member?.id}
          member={member}
          otherMember={otherMember}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
