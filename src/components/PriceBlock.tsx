import { getMessages } from '@/lib/i18n/es';
import { formatEur } from '@/lib/format';
import type { CardPrice } from '@/lib/pricing';

/** Base price in mono/lapis; the acrylic price is always secondary and small. "Desde" only when models/sizes change the base price. */
export function PriceBlock({ price }: { price: CardPrice }) {
  const t = getMessages().pricing;
  return (
    <div>
      <p className="data text-[15px] text-anar-text">
        {price.from && <span className="mr-1.5 font-sans text-[13px] font-normal text-ink-muted">{t.from}</span>}
        {formatEur(price.cents)}
      </p>
      {price.acrylic && (
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">
          {price.acrylic.from ? t.alsoAcrylicFrom : t.alsoAcrylic} {formatEur(price.acrylic.cents)}
        </p>
      )}
    </div>
  );
}
