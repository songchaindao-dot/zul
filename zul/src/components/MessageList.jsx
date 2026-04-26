import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList({ messages, member, otherMember, onEdit, onDelete }) {
  const bottomRef = useRef(null);
  const lastScrollHeightRef = useRef(0);

  useEffect(() => {
    const el = bottomRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center">
        <div>
          <div className="text-4xl mb-3">💕</div>
          <p>Say something beautiful.</p>
          <p className="text-xs mt-1 text-slate-600">Your messages translate automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
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
      <div ref={bottomRef} />
    </div>
  );
}
