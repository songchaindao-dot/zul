import { useState, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder.jsx';
import AttachmentMenu from './AttachmentMenu.jsx';
import { api } from '../lib/api.js';

export default function Composer({ onTyping, onStopTyping, onMessageSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(null);
  const textareaRef = useRef();

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    onStopTyping?.();
    try {
      await api.post('/messages/send', { text: msg });
      onMessageSent?.();
    } catch (e) {
      alert(e.message);
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  if (recording) {
    return (
      <div className="px-3 py-2 border-t border-slate-800">
        <VoiceRecorder
          onDone={() => { setRecording(false); onMessageSent?.(); }}
          onCancel={() => setRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-t border-slate-800 bg-slate-950">
      {uploading && (
        <div className="text-xs text-slate-400 animate-pulse mb-1 px-1">
          Uploading {uploading}…
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Attach */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowAttach(v => !v)}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-pink-400 transition-colors text-xl"
          >＋</button>
          {showAttach && (
            <AttachmentMenu
              onClose={() => setShowAttach(false)}
              onUploading={(type) => { setUploading(type); setShowAttach(false); }}
              onDone={() => { setUploading(null); onMessageSent?.(); }}
              onError={(msg) => { setUploading(null); alert(msg); }}
            />
          )}
        </div>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 bg-slate-800 text-rose-50 placeholder-slate-500 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-pink-600 leading-relaxed max-h-32 overflow-y-auto"
          style={{ minHeight: 40 }}
        />

        {/* Send or mic */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-full transition-colors"
          >▶</button>
        ) : (
          <button
            onClick={() => setRecording(true)}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-pink-400 transition-colors text-xl"
          >🎤</button>
        )}
      </div>
    </div>
  );
}
