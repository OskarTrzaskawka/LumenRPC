/** Brand mark and illustrations — all inline SVG so they theme with the accent color. */

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="116" fill="var(--accent)" />
      <circle cx="256" cy="256" r="148" fill="none" stroke="#0b0c10" strokeWidth="30" />
      <circle cx="256" cy="256" r="80" fill="#0b0c10" />
      <circle cx="230" cy="228" r="24" fill="#edebff" />
      <circle cx="361" cy="151" r="58" fill="var(--accent)" />
      <circle cx="361" cy="151" r="38" fill="#3dd68c" />
    </svg>
  );
}

export function OrbitHero({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" className={className} role="img" aria-label="Lumen RPC orbit illustration">
      <circle cx="210" cy="210" r="196" fill="none" stroke="#242636" />
      <circle cx="210" cy="210" r="146" fill="none" stroke="#242636" />
      <circle cx="210" cy="210" r="96" fill="none" stroke="#2c2e42" />
      <g className="pulse-soft">
        <circle cx="210" cy="210" r="62" fill="color-mix(in oklab, var(--accent) 22%, #0a0b0f)" />
        <circle cx="210" cy="210" r="38" fill="var(--accent)" />
        <circle cx="210" cy="210" r="16" fill="#0a0b0f" />
      </g>
      <g className="orbit">
        <circle cx="210" cy="14" r="10" fill="#4FD1C5" />
        <circle cx="406" cy="210" r="6" fill="#FF8A4C" />
        <rect x="40" y="320" width="34" height="34" rx="9" fill="#151620" stroke="#2c2e42" />
        <path d="M50 337h14M57 330v14" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="orbit-rev">
        <circle cx="64" cy="210" r="8" fill="#F472B6" />
        <rect x="300" y="88" width="64" height="26" rx="13" fill="#151620" stroke="#2c2e42" />
        <circle cx="315" cy="101" r="5" fill="#3dd68c" />
        <rect x="325" y="98" width="30" height="6" rx="3" fill="#8a8ea3" />
        <rect x="120" y="330" width="56" height="20" rx="10" fill="#151620" stroke="#2c2e42" />
        <rect x="132" y="337" width="32" height="6" rx="3" fill="var(--accent)" />
      </g>
    </svg>
  );
}

export function EmptyIllustration({ kind }: { kind: "rules" | "schedule" | "search" }) {
  return (
    <svg width="148" height="104" viewBox="0 0 148 104" aria-hidden="true">
      <rect x="10" y="14" width="128" height="80" rx="14" fill="#151620" stroke="#242636" />
      {kind === "rules" && (
        <>
          <rect x="24" y="32" width="36" height="14" rx="7" fill="#242636" />
          <path d="M66 39h14" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <path d="M76 34l5 5-5 5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <rect x="88" y="32" width="36" height="14" rx="7" fill="color-mix(in oklab, var(--accent) 35%, #151620)" />
          <rect x="24" y="58" width="60" height="8" rx="4" fill="#242636" />
          <rect x="24" y="72" width="40" height="8" rx="4" fill="#242636" />
        </>
      )}
      {kind === "schedule" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="24" y={30 + i * 14} width="100" height="8" rx="4" fill="#1c1d2a" />
          ))}
          <rect x="44" y="30" width="40" height="8" rx="4" fill="var(--accent)" />
          <rect x="70" y="44" width="30" height="8" rx="4" fill="#4FD1C5" />
          <rect x="34" y="58" width="50" height="8" rx="4" fill="#FF8A4C" />
          <rect x="88" y="72" width="28" height="8" rx="4" fill="#F472B6" />
        </>
      )}
      {kind === "search" && (
        <>
          <circle cx="66" cy="50" r="18" fill="none" stroke="var(--accent)" strokeWidth="4" />
          <path d="M80 64l14 14" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
