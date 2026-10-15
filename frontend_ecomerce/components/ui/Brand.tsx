export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 font-extrabold" style={{ color: 'var(--color-primary)' }}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 shrink-0" fill="none">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path d="M10 8v16h13v-4h-9V8z" fill="var(--color-surface)" />
        <path d="m21 8 3 3-3 3-3-3z" fill="var(--color-surface)" />
      </svg>
      <span>Lerium Shop</span>
    </span>
  );
}
