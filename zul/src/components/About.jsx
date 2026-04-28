import ZulLogo from './ZulLogo.jsx';

export default function About({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="bg-[#0d0120] border border-violet-800/40 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <ZulLogo size={44} />
          <div>
            <h2 className="text-rose-50 font-bold text-lg">Zul</h2>
            <p className="text-violet-400 text-xs">Auto Translate Messenger</p>
          </div>
        </div>

        <div className="text-sm text-slate-300 space-y-3">
          <p>Zul is a private, real-time chat app that automatically translates every message between two languages, so you and your contact can always communicate naturally, in your own words.</p>
          <ul className="space-y-2 text-violet-300">
            <li>🌍 <span className="text-white font-medium">Auto-translation</span>: messages translate instantly as they arrive</li>
            <li>🔒 <span className="text-white font-medium">Private rooms</span>: invite-only, no account required</li>
            <li>🎙️ <span className="text-white font-medium">Voice & media</span>: send voice notes, photos, and files</li>
            <li>⚡ <span className="text-white font-medium">Real-time</span>: see messages the moment they're sent</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-violet-800/40 hover:bg-violet-700/50 text-rose-50 rounded-xl text-sm transition-colors border border-violet-700/30"
        >
          Close
        </button>
      </div>
    </div>
  );
}
