'use client';
import { useRef } from 'react';
import type { Guide } from '@/lib/guides';
import { SizeGuideView } from './SizeGuideView';

/** "Guía de tallas" button + accessible modal (native <dialog>: focus trap, Esc to close, focus returns to the button). */
export function SizeGuideDialog({ guide }: { guide: Guide }) {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dlg.current?.showModal()} className="label inline-flex min-h-11 items-center rounded-full border-2 border-ink-muted px-5 text-ink hover:bg-surface">
        Guía de tallas
      </button>
      <dialog
        ref={dlg}
        aria-labelledby="guide-title"
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}
        className="m-auto max-h-[90vh] w-[min(94vw,640px)] max-w-none overflow-y-auto rounded-lg border-0 bg-ground p-0 text-ink backdrop:bg-black/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-ground px-5 py-3">
          <span id="guide-title" className="label">Guía de tallas</span>
          <button type="button" onClick={() => dlg.current?.close()} className="label inline-flex min-h-11 items-center rounded-full bg-surface px-5" autoFocus>Cerrar</button>
        </div>
        <div className="px-5 py-6"><SizeGuideView guide={guide} headingLevel={3} /></div>
      </dialog>
    </>
  );
}
