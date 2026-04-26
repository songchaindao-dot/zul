import { useState, useEffect, useCallback } from 'react';
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
    <div className="h-screen flex flex-col bg-slate-950 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <button onClick={() => setShowAbout(true)}>
          <ZulLogo size={32} />
        </button>

        <div className="flex-1 min-w-0">
          {other ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{other.avatar_emoji}</span>
              <div>
                <p className="text-rose-50 font-semibold text-sm truncate">{other.display_name}</p>
                <div className="flex items-center gap-1">
                  <PresenceDot member={other} showLabel />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-rose-50 font-semibold text-sm">Waiting for someone to join…</p>
              <p className="text-xs text-slate-500">Share the link below</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowShare(true)}
          className="text-slate-400 hover:text-pink-400 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-800"
          title="Share room link"
        >
          🔗
        </button>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        member={member}
        otherMember={other}
        onEdit={setEditingMessage}
        onDelete={handleDelete}
      />

      {/* Typing indicator */}
      <TypingIndicator typingEvent={otherTyping} memberName={other?.display_name} />

      {/* Composer */}
      <Composer
        onTyping={handleInputChange}
        onStopTyping={stopTyping}
        onMessageSent={reload}
      />

      {/* Modals */}
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
  );
}
