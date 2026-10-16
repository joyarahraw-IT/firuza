'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export type GalleryImage = { src: string; thumb: string; alt: string; /** e.g. "Foto real, en mano" */ label?: string | null };

/** Main photo + thumbnails; click opens a lightbox where the photo can be zoomed (click or +/- keys). Rugs show the full photo. */
export function ProductGallery({ images, contain }: { images: GalleryImage[]; contain: boolean }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const dlg = useRef<HTMLDialogElement>(null);
  const n = images.length;
  const go = (d: number) => { setI((v) => (v + d + n) % n); setZoom(false); };

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === '+' || e.key === '=') setZoom(true);
      if (e.key === '-') setZoom(false);
    };
    d.addEventListener('keydown', onKey);
    return () => d.removeEventListener('keydown', onKey);
  });

  const cur = images[i];
  return (
    <div>
      <button
        type="button"
        onClick={() => { setZoom(false); dlg.current?.showModal(); }}
        className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-lg bg-photo"
        aria-label={`Ampliar foto: ${cur.alt}`}
      >
        <Image
          src={cur.src}
          alt={cur.alt}
          fill
          loading="eager" fetchPriority="high"
          sizes="(min-width:1024px) 560px, 100vw"
          className={contain ? 'object-contain' : 'object-cover'}
        />
        {cur.label && <span className="absolute bottom-3 left-3 rounded-full bg-ground px-3 py-1.5 text-[13px] font-bold text-ink">{cur.label}</span>}
      </button>

      {n > 1 && (
        <ul className="mt-3 grid list-none grid-cols-5 gap-2 p-0" aria-label="Fotos del producto">
          {images.map((im, k) => (
            <li key={im.src}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-label={`Ver foto ${k + 1} de ${n}`}
                aria-current={k === i}
                className={`relative block aspect-[4/5] w-full overflow-hidden rounded-[14px] bg-photo outline-offset-2 ${k === i ? 'ring-2 ring-turq' : 'opacity-80 hover:opacity-100'}`}
              >
                <Image src={im.thumb} alt="" fill sizes="110px" className={contain ? 'object-contain' : 'object-cover'} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dlg} className="m-auto w-[min(96vw,1100px)] max-w-none border-0 bg-cotton p-0 backdrop:bg-black/70" aria-label="Foto ampliada">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <p className="text-sm text-muted">{i + 1} / {n} · {zoom ? 'Clic para reducir' : 'Clic para acercar'}</p>
          <form method="dialog"><button className="btn btn-secondary min-h-10 px-4">Cerrar</button></form>
        </div>
        <div
          className={`relative h-[78vh] overflow-hidden bg-photo ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setZoom((z) => !z)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
        >
          <Image
            src={cur.src}
            alt={cur.alt}
            fill
            sizes="96vw"
            className="object-contain transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: zoom ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
          />
        </div>
        {n > 1 && (
          <div className="flex justify-between border-t border-line p-3">
            <button type="button" className="btn btn-secondary min-h-10 px-4" onClick={() => go(-1)}>← Anterior</button>
            <button type="button" className="btn btn-secondary min-h-10 px-4" onClick={() => go(1)}>Siguiente →</button>
          </div>
        )}
      </dialog>
    </div>
  );
}
