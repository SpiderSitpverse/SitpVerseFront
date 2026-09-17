const WINDOW_XS = [70, 108, 146, 184, 250, 288, 326, 364, 420, 458];

function Passenger({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#20222b" opacity="0.75">
      <circle cx={x} cy={y - 5} r="4.2" />
      <path d={`M${x - 6} ${y + 10} q6 -9 12 0 z`} />
    </g>
  );
}

/**
 * Stylized side-profile of an articulated TransMilenio-liveried bus.
 */
export function BusBlueprint({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 190" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="300" cy="172" rx="270" ry="8" fill="#000000" opacity="0.08" />

      <path
        d="M20 150 V90 Q20 60 50 58 L560 58 Q580 60 580 90 V150 Z"
        fill="#E4293B"
      />
      <path d="M20 150 V125 H580 V150 Z" fill="#B0111F" />
      <path d="M40 90 L230 58 L260 58 L90 90 Z" fill="#FFD400" />
      <path d="M340 90 L500 58 L560 58 Q578 60 580 82 L580 90 Z" fill="#FFD400" />

      <rect x="55" y="66" width="480" height="30" rx="6" fill="#1B1D24" />
      {WINDOW_XS.map((x) => (
        <rect key={x} x={x} y="70" width="30" height="22" rx="3" fill="#5B7C99" />
      ))}
      {WINDOW_XS.map((x) => (
        <Passenger key={x} x={x + 15} y={82} />
      ))}

      <rect x="212" y="58" width="20" height="92" fill="#2A2C34" />
      <rect x="212" y="58" width="20" height="92" fill="url(#accordion)" opacity="0.5" />

      <rect x="15" y="60" width="10" height="88" rx="4" fill="#1B1D24" />

      <text x="300" y="115" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="20" fill="#F5F5F5" letterSpacing="0.5">
        TransMilenio
      </text>

      {[70, 130, 470, 530].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="152" r="17" fill="#141416" />
          <circle cx={cx} cy="152" r="8" fill="#3a3a42" />
        </g>
      ))}

      <defs>
        <linearGradient id="accordion" x1="212" y1="0" x2="232" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#000" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
