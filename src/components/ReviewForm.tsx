'use client';
import { useActionState } from 'react';
import { submitReview } from '@/app/(shop)/cuenta/actions';

const input = 'mt-1.5 block min-h-11 w-full rounded-sm border border-ink-muted bg-ground px-3 text-base text-ink';

export function ReviewForm({ orderId, productId, productName }: { orderId: string; productId: string; productName: string }) {
  const [s, act, pending] = useActionState(submitReview, undefined);
  if (s?.ok) return <p role="status" className="rounded-lg bg-turq-tint p-3 text-turq-dark">{s.message}</p>;
  return (
    <details className="rounded-lg border border-line bg-surface p-4">
      <summary className="cursor-pointer font-semibold">Dejar una opinión sobre «{productName}»</summary>
      <form action={act} key={s?.error ?? 'f'} className="mt-4 max-w-xl space-y-4">
        <input type="hidden" name="order" value={orderId} />
        <input type="hidden" name="product" value={productId} />
        <fieldset className="border-0 p-0">
          <legend className="mb-1 text-sm font-medium">Valoración</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="rating" value={n} defaultChecked={s?.values?.rating === String(n)} required className="peer sr-only" />
                <span className="grid h-11 w-11 place-items-center text-2xl text-line peer-checked:text-saffron peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-turq" aria-label={n + ' de 5'}>★</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-[15px] font-medium">Título (opcional)<input name="title" maxLength={80} defaultValue={s?.values?.title} className={input} /></label>
        <label className="block text-[15px] font-medium">Tu opinión<textarea name="body" rows={4} required maxLength={2000} defaultValue={s?.values?.body} className={input + ' py-2'} /></label>
        <div role="alert" aria-live="polite">{s?.error && <p className="rounded-lg border border-madder bg-ground p-3 text-madder">{s.error}</p>}</div>
        <button className="btn btn-primary disabled:opacity-60" disabled={pending}>{pending ? 'Enviando…' : 'Enviar opinión'}</button>
      </form>
    </details>
  );
}
