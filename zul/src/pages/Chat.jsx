import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Lock, MoreVertical, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { setRoomCredentials, api } from '../lib/api.js';
import { useMessages } from '../hooks/useMessages.js';
import { usePresence } from '../hooks/usePresence.js';
import { useTyping } from '../hooks/useTyping.js';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import MessageList from '../components/MessageList.jsx';
import Composer from '../components/Composer.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import PresenceDot from '../components/PresenceDot.jsx';
import ShareRoomLink from '../components/ShareRoomLink.jsx';
import EditMessageModal from '../components/EditMessageModal.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';
import About from '../components/About.jsx';
import ZulLogo from '../components/ZulLogo.jsx';

export default function Chat({ room, member: initialMember, otherMembers: initialOthers, shareUrl }) {
  const [member, setMember] = useState(initialMember);
  const [otherMembers, setOtherMembers] = useState(initialOthers);
  const [showShare, setShowShare] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  const { messages, reload } = useMessages(room, supabase);
  const { permission, requestPermission } = usePushNotifications();
  const { otherTyping, handleInputChange, stopTyping } = useTyping(room, member, supabase);

  usePresence(room);

  // Watch other member presence via realtime
  useEffect(() => {
    const channel = supabase
      .channel(`members-presence:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'members',
        filter: `room_id=eq.${room.id}`,
      }, ({ new: updated }) => {
        if (updated.id === member.id) setMember(updated);
        else setOtherMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, member.id]);

  // Mark messages as read when new ones arrive
  useEffect(() => {
    const unread = messages
      .filter(m => m.sender_id !== member.id && !(m.read_by || []).includes(member.id) && !m.deleted_at)
      .map(m => m.id);
    if (unread.length) {
      api.post('/messages/read', { message_ids: unread }).catch(() => {});
    }
  }, [messages, member.id]);

  // Ask for push permission once
  useEffect(() => {
    if (permission === 'default') {
      const timer = setTimeout(() => requestPermission(), 5000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  const handleEdit = async (newText) => {
    await api.patch('/messages/edit', { message_id: editingMessage.id, new_text: newText });
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    await api.delete('/messages/delete', { message_id: messageId });
  };

  const other = otherMembers[0];

  return (
    <div className="flex h-dvh flex-col bg-[#05010d] text-rose-50 sm:items-center sm:justify-center sm:overflow-auto sm:p-6">
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#0b0613] sm:h-auto sm:min-h-[820px] sm:max-w-lg sm:rounded-[34px] sm:border sm:border-white/10 sm:shadow-[0_30px_80px_rgba(3,1,10,0.65)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                backgroundColor: '#090312',
                backgroundImage: `
                  radial-gradient(circle at top, rgba(168, 85, 247, 0.24), transparent 32%),
                  radial-gradient(circle at 20% 20%, rgba(91, 33, 182, 0.22), transparent 28%),
                  linear-gradient(180deg, #10071b 0%, #090312 100%)
                `,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 24px 24px, rgba(196, 181, 253, 0.32) 1.2px, transparent 0),
                  radial-gradient(circle at 72px 72px, rgba(196, 181, 253, 0.24) 1px, transparent 0)
                `,
                backgroundSize: '96px 96px',
              }}
            />
          </div>

          <div className="relative z-10 flex items-center gap-3 bg-[#08111f]/92 px-3 py-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : setShowAbout(true))}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
              aria-label="Open Zul details"
            >
              <ZulLogo size={34} />
            </button>

            <div className="min-w-0 flex-1">
              {other ? (
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight text-white">{other.display_name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-sm">{other.avatar_emoji}</span>
                    <PresenceDot member={other} showLabel />
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight text-white">Zul chat room</p>
                  <p className="text-xs text-violet-200/75">Waiting for someone to join</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Share room link"
              aria-label="Share room link"
            >
              <MoreVertical size={20} />
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-2 border-b border-white/5 bg-[#11081d]/88 px-4 py-2 text-[11px] text-violet-100/80 backdrop-blur">
            <Lock size={12} className="text-violet-200" />
            <span className="truncate">Private translated chat with Zul branding</span>
            <Sparkles size={12} className="ml-auto text-fuchsia-300" />
          </div>

          <MessageList
            messages={messages}
            member={member}
            otherMember={other}
            onEdit={setEditingMessage}
            onDelete={handleDelete}
          />

          <TypingIndicator typingEvent={otherTyping} memberName={other?.display_name} />

          <Composer
            onTyping={handleInputChange}
            onStopTyping={stopTyping}
            onMessageSent={reload}
          />

          {showShare && <ShareRoomLink shareUrl={shareUrl} onClose={() => setShowShare(false)} />}
          {showAbout && <About onClose={() => setShowAbout(false)} />}
          {editingMessage && (
            <EditMessageModal
              message={editingMessage}
              onSave={handleEdit}
              onClose={() => setEditingMessage(null)}
            />
          )}
          <InstallPrompt />
        </div>
      </div>
    </div>
  );
}
