/**
 * Neutral kilim-pattern block shown where a photo of the owner will go (until one is uploaded in the admin).
 * Pure SVG, decorative only.
 */
export function KilimPlaceholder({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 560" role="img" aria-label="Dibujo decorativo de un kilim" preserveAspectRatio="xMidYMid slice" className={className}>
      <title>Dibujo decorativo de un kilim</title>
      <defs>
        <pattern id="kp-a" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 2 38 20 20 38 2 20z" fill="#1a9e96" />
          <path d="M20 12 28 20 20 28 12 20z" fill="#fbf8f3" />
        </pattern>
        <pattern id="kp-b" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40 20 0 40 40z" fill="#a3262a" />
          <path d="M12 40 20 22 28 40z" fill="#f2a33a" />
        </pattern>
        <pattern id="kp-c" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#fbe8d8" />
          <path d="M10 2 18 10 10 18 2 10z" fill="none" stroke="#1a9e96" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="400" height="560" fill="#fbe8d8" />
      <rect x="14" y="14" width="372" height="532" fill="none" stroke="#1a9e96" strokeWidth="2" />
      <rect x="26" y="26" width="348" height="508" fill="#fbf8f3" />
      <rect x="26" y="26" width="348" height="40" fill="url(#kp-a)" />
      <rect x="26" y="494" width="348" height="40" fill="url(#kp-a)" />
      <rect x="26" y="74" width="348" height="40" fill="url(#kp-b)" />
      <rect x="26" y="446" width="348" height="40" fill="url(#kp-b)" transform="rotate(180 200 466)" />
      <rect x="62" y="136" width="276" height="288" fill="url(#kp-c)" stroke="#1a9e96" strokeWidth="1.5" />
      <path d="M200 176 300 280 200 384 100 280z" fill="#1a9e96" opacity=".92" />
      <path d="M200 214 266 280 200 346 134 280z" fill="#fbf8f3" />
      <path d="M200 244 232 280 200 316 168 280z" fill="#a3262a" />
    </svg>
  );
}
