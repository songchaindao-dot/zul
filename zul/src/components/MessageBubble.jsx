import { useState, useRef } from 'react';
import TextMessage from './TextMessage.jsx';
import VoiceMessage from './VoiceMessage.jsx';
import PhotoMessage from './PhotoMessage.jsx';
import VideoMessage from './VideoMessage.jsx';
import FileMessage from './FileMessage.jsx';
import ReactionPicker from './ReactionPicker.jsx';
import { formatTime } from '../lib/format.js';
import { api } from '../lib/api.js';

function groupReactions(reactions, memberId) {
  const map = {};
  for (const r of reactions || []) {
    const [id, emoji] = r.split(':');
    if (!map[emoji]) map[emoji] = { emoji, count: 0, mine: false };
    map[emoji].count++;
    if (id === memberId) map[emoji].mine = true;
  }
  return Object.values(map);
}

function ReadReceipt({ message, isMine, otherMemberId }) {
  if (!isMine) return null;
  const read = (message.read_by || []).includes(otherMemberId);
  return <span className={`text-[11px] ${read ? 'text-violet-200' : 'text-violet-300/65'}`}>{read ? '✓✓' : '✓'}</span>;
}

export default function MessageBubble({ message, isMine, member, otherMember, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const longPressRef = useRef(null);
  const bubbleRef = useRef(null);

  const handleLongPress = () => { setShowMenu(true); };
  const handleContextMenu = (e) => { e.preventDefault(); setShowMenu(true); };

  const onPointerDown = () => {
    longPressRef.current = setTimeout(handleLongPress, 500);
  };
  const onPointerUp = () => clearTimeout(longPressRef.current);

  const canEdit = isMine &&
    message.message_type === 'text' &&
    !message.deleted_at &&
    new Date(message.created_at) > new Date(Date.now() - 15 * 60 * 1000);

  const canDelete = isMine && !message.deleted_at;

  const handleReact = async (emoji) => {
    try { await api.post('/messages/react', { message_id: message.id, emoji }); }
    catch {}
  };

  const reactions = groupReactions(message.reactions, member?.id);

  const bubbleClass = isMine
    ? 'ml-auto rounded-[22px] rounded-br-md border border-violet-300/15 bg-[linear-gradient(180deg,#7c3aed_0%,#581c87_100%)] text-white shadow-[0_16px_32px_rgba(76,29,149,0.32)]'
    : 'rounded-[22px] rounded-bl-md border border-white/6 bg-[#1a2230]/88 text-slate-50 shadow-[0_10px_24px_rgba(2,6,23,0.28)] backdrop-blur-sm';

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex ${isMine ? 'justify-end' : 'justify-start'} py-1`}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex max-w-[86%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`cursor-pointer select-none px-4 py-2.5 ${bubbleClass}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {message.message_type === 'text' && <TextMessage message={message} isMine={isMine} />}
          {message.message_type === 'voice' && <VoiceMessage message={message} isMine={isMine} />}
          {message.message_type === 'photo' && <PhotoMessage message={message} isMine={isMine} />}
          {message.message_type === 'video' && <VideoMessage message={message} isMine={isMine} />}
          {message.message_type === 'file' && <FileMessage message={message} />}
        </div>

        {/* Time + read receipt */}
        <div className={`mt-1 flex items-center gap-1 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[11px] ${isMine ? 'text-violet-100/75' : 'text-slate-400'}`}>{formatTime(message.created_at)}</span>
          <ReadReceipt message={message} isMine={isMine} otherMemberId={otherMember?.id} />
        </div>

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {reactions.map(({ emoji, count, mine }) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors
                  ${mine ? 'border-violet-400/50 bg-violet-500/25 text-violet-50' : 'border-white/8 bg-slate-800/70 text-slate-100'}`}
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}

        {showReactions && (
          <div className="relative">
            <ReactionPicker onPick={handleReact} onClose={() => setShowReactions(false)} />
          </div>
        )}
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className={`absolute bottom-full z-20 mb-2 min-w-[150px] overflow-hidden rounded-2xl border border-white/10 bg-[#171225] shadow-xl ${isMine ? 'right-0' : 'left-0'}`}>
            <button
              onClick={() => { setShowReactions(true); setShowMenu(false); }}
              className="w-full px-4 py-3 text-left text-sm text-rose-50 transition hover:bg-white/5"
            >😊 React</button>
            {canEdit && (
              <button
                onClick={() => { onEdit(message); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-rose-50 transition hover:bg-white/5"
              >✏️ Edit</button>
            )}
            {canDelete && (
              <button
                onClick={() => { onDelete(message.id); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left text-sm text-red-300 transition hover:bg-white/5"
              >🗑️ Delete</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
