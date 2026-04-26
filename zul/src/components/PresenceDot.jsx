import { formatLastSeen } from '../lib/format.js';

export default function PresenceDot({ member, showLabel = false }) {
  if (!member) return null;

  const lastSeen = member.last_seen ? new Date(member.last_seen) : null;
  const minsAgo = lastSeen ? (Date.now() - lastSeen.getTime()) / 60000 : Infinity;

  let color, label;
  if (member.status === 'online' && minsAgo < 1) {
    color = 'bg-green-400';
    label = 'online';
  } else if (minsAgo < 5) {
    color = 'bg-yellow-400';
    label = formatLastSeen(member.last_seen);
  } else {
    color = 'bg-slate-500';
    label = formatLastSeen(member.last_seen);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} ring-2 ring-[#08111f]`} />
      {showLabel && <span className="text-xs text-violet-100/60">{label}</span>}
    </span>
  );
}
