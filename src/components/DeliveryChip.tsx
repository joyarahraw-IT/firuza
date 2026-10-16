/**
 * Making time (or arrival time for rugs) in numbers, in mono, on surface-200. Firuza bead = made to order, anar bead = already woven.
 * `compact` (product cards): below 640px only the range ("3–5 días") shows; the full text stays in title and for screen readers.
 */
export function DeliveryChip({ mode, making, shipping, compact = false, className = '' }: { mode: 'made_to_order' | 'shipped'; making: [number, number] | null; shipping: [number, number] | null; compact?: boolean; className?: string }) {
  const rug = mode === 'shipped';
  const r = rug ? shipping : making;
  if (!r) return null;
  const range = r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
  const full = rug ? `Llega en ${range} días` : `Hecho en ${range} días + envío`;
  return (
    <span title={compact ? full : undefined} className={`data inline-flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink ${className}`}>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: rug ? 'var(--anar)' : 'var(--firuza)' }} />
      {compact ? (
        <>
          <span className="sr-only">{full}</span>
          <span aria-hidden="true" className="whitespace-nowrap sm:hidden">{range} días</span>
          <span aria-hidden="true" className="hidden sm:inline">{full}</span>
        </>
      ) : (
        full
      )}
    </span>
  );
}
