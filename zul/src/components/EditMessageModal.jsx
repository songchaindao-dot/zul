import { useState } from 'react';

export default function EditMessageModal({ message, onSave, onClose }) {
  const [text, setText] = useState(message.original_text || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(text.trim());
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-md space-y-3">
        <h3 className="text-rose-50 font-semibold">Edit message</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          className="w-full bg-slate-800 text-rose-50 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-pink-500"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="px-4 py-2 text-sm bg-pink-600 hover:bg-pink-500 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
