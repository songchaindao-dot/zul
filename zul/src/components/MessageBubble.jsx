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
  return <span className={`text-xs ml-1 ${read ? 'text-pink-400' : 'text-slate-500'}`}>{read ? '✓✓' : '✓'}</span>;
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
    ? 'bg-gradient-to-br from-pink-600 to-purple-700 text-rose-50 rounded-2xl rounded-br-sm ml-auto'
    : 'bg-slate-800 text-rose-50 rounded-2xl rounded-bl-sm';

  return (
    <div
      ref={bubbleRef}
      className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} gap-2 group relative`}
      onContextMenu={handleContextMenu}
    >
      {/* Avatar */}
      <div className="text-xl flex-shrink-0 self-end">{(isMine ? member : otherMember)?.avatar_emoji || '💬'}</div>

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`px-3 py-2 ${bubbleClass} cursor-pointer select-none`}
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
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-slate-500">{formatTime(message.created_at)}</span>
          <ReadReceipt message={message} isMine={isMine} otherMemberId={otherMember?.id} />
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactions.map(({ emoji, count, mine }) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors
                  ${mine ? 'bg-pink-600/40 border border-pink-500' : 'bg-slate-700/60 border border-slate-600'}`}
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className="relative">
            <ReactionPicker onPick={handleReact} onClose={() => setShowReactions(false)} />
          </div>
        )}
      </div>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className={`absolute bottom-full mb-1 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[140px] ${isMine ? 'right-0' : 'left-0'}`}>
            <button
              onClick={() => { setShowReactions(true); setShowMenu(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-rose-50 hover:bg-slate-700"
            >😊 React</button>
            {canEdit && (
              <button
                onClick={() => { onEdit(message); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-50 hover:bg-slate-700"
              >✏️ Edit</button>
            )}
            {canDelete && (
              <button
                onClick={() => { onDelete(message.id); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700"
              >🗑️ Delete</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
