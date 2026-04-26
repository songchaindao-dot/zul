export default function ZulLogo({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="zul-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#zul-bg)" />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse
          key={angle}
          cx="50" cy="28"
          rx="7" ry="16"
          fill="#f97316"
          fillOpacity="0.85"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="14" fill="#1e0a2e" fillOpacity="0.5" />
      <text x="50" y="57" textAnchor="middle" fontSize="18" dominantBaseline="middle">💕</text>
      <text x="18" y="22" fontSize="9">✨</text>
      <text x="76" y="18" fontSize="7">✨</text>
      <text x="14" y="78" fontSize="6">✨</text>
    </svg>
  );
}
