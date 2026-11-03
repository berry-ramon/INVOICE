export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <rect width="44" height="44" rx="12" fill="#0B6B57" />
        <path d="M13 8h13l6 6v21H13z" fill="white" />
        <path d="M26 8v7h6" fill="#E8A317" />
        <path
          d="m17 27 4 4 8-9"
          fill="none"
          stroke="#0B6B57"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
      </svg>
      {!compact && <strong>hatiri</strong>}
    </div>
  );
}
