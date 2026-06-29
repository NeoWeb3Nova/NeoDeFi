export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 3.75c11.184 0 20.25 9.066 20.25 20.25S35.184 44.25 24 44.25 3.75 35.184 3.75 24 12.816 3.75 24 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".32"
      />
      <path
        d="M12.5 32.5V15.7l11.8 12.6V15.5l11.2 10.8"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34.4 14.2 36 26.3l-11.9 1.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".72"
      />
      <circle cx="12.5" cy="32.5" r="2.4" fill="currentColor" />
      <circle cx="24.3" cy="28.3" r="2.4" fill="currentColor" />
      <circle cx="35.5" cy="26.3" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 text-[var(--neo)]">
      <BrandMark size={compact ? 32 : 40} />
      <span className="leading-none">
        <strong className="block font-display text-[17px] font-bold tracking-[-.04em] text-[var(--text)]">
          NEO DEFI
        </strong>
        {!compact ? (
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.24em] text-[var(--muted)]">
            Onchain Index Protocol
          </span>
        ) : null}
      </span>
    </span>
  );
}
