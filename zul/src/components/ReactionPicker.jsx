const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥', '💕', '🫶', '😍', '🥰'];

export default function ReactionPicker({ onPick, onClose }) {
  return (
    <div className="absolute bottom-full mb-1 left-0 z-20 bg-slate-800 border border-slate-700 rounded-2xl p-2 flex gap-1 shadow-xl">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => { onPick(emoji); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-lg transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
