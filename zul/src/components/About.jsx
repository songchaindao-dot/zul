import ZulLogo from './ZulLogo.jsx';

export default function About({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <ZulLogo size={40} />
          <div>
            <h2 className="text-rose-50 font-bold text-lg">Zul</h2>
            <p className="text-slate-400 text-xs">Two hearts. Two languages. One conversation.</p>
          </div>
        </div>

        <div className="text-sm text-slate-300 space-y-3">
          <h3 className="text-rose-50 font-semibold">The Story</h3>
          <p>The builder met Zuleima online. They didn't speak the same language. Translation apps got in the way every time they wanted to say something real.</p>
          <p>So he built Zul. A private chatroom for two - where every message, every voice note, every caption automatically translates between your languages. Where you can actually be yourself, in your own words, and still be understood.</p>
          <p className="text-pink-300 italic">Zul is yours now too.</p>
          <p className="text-slate-500 text-xs">- With love, the builder</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-50 rounded-xl text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
