import { useInstall } from '../hooks/useInstall.js';

export default function InstallPrompt() {
  const { isInstallable, isIOS, isInstalled, install } = useInstall();

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="fixed bottom-24 right-4 z-30 bg-gradient-to-r from-pink-600 to-purple-700 text-white text-xs rounded-2xl px-4 py-2 shadow-lg hover:from-pink-500 hover:to-purple-600 transition-all"
      >
        📲 Install Zul
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-30 bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-slate-300 shadow-xl">
        <p className="font-semibold text-rose-50 mb-1">Install Zul on iPhone</p>
        <p>Tap <strong>Share</strong> (↑) → <strong>Add to Home Screen</strong> → <strong>Add</strong></p>
      </div>
    );
  }

  return null;
}
