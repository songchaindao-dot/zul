import zulLogo from '../assets/zul-logo.png';

export default function ZulLogo({ size = 48, className = '' }) {
  return (
    <img
      src={zulLogo}
      alt="Zul"
      width={size}
      height={size}
      className={`object-contain drop-shadow-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
