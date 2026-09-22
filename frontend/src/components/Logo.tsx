interface LogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
}

const SIZE_MAP = {
  sm: { padding: "0.3rem 0.7rem", fontSize: "1rem", radius: "6px", tagline: "0.7rem" },
  md: { padding: "0.45rem 1rem", fontSize: "1.35rem", radius: "8px", tagline: "0.7rem" },
  lg: { padding: "0.7rem 1.6rem", fontSize: "2.3rem", radius: "12px", tagline: "0.85rem" },
};

export function Logo({ size = "md", withTagline = false }: LogoProps) {
  const s = SIZE_MAP[size];

  return (
    <div className="pm-logo-block">
      <div
        className="pm-logo-badge"
        style={{ padding: s.padding, borderRadius: s.radius, fontSize: s.fontSize }}
      >
        <span className="pm-logo-parcel">PARCEL</span>
        <svg
          className="pm-logo-truck"
          viewBox="0 0 64 40"
          style={{ height: "0.85em", width: "auto" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="1" y="10" width="34" height="18" rx="2" fill="#f5a623" />
          <path d="M35 16h14l10 8v4H35V16Z" fill="#f5a623" />
          <rect x="35" y="16" width="14" height="8" fill="#1b3a5c" opacity="0.15" />
          <circle cx="14" cy="30" r="6" fill="#111827" />
          <circle cx="14" cy="30" r="2.4" fill="#9ca3af" />
          <circle cx="47" cy="30" r="6" fill="#111827" />
          <circle cx="47" cy="30" r="2.4" fill="#9ca3af" />
        </svg>
        <span className="pm-logo-mex">MEX.</span>
      </div>
      {withTagline && (
        <p className="pm-logo-tagline" style={{ fontSize: s.tagline }}>
          Smart Logistics, Powered by AI
        </p>
      )}
    </div>
  );
}
