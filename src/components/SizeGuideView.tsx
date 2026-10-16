import type { Guide } from '@/lib/guides';

/** Simple front view of a neckline with the necklace types, from the shortest to the longest. Decorative; the table has the same data. */
function NecklineDiagram() {
  const rows: [string, string, number][] = [
    ['Gargantilla', '35–40 cm', 66],
    ['Princesa', '43–48 cm', 82],
    ['Matinée', '50–60 cm', 104],
    ['Ópera', '70–90 cm', 150],
    ['Sautoir', '90+ cm', 196],
  ];
  return (
    <svg viewBox="0 0 360 250" role="img" aria-label="Dibujo de un cuello y los largos de collar: gargantilla, princesa, matinée, ópera y sautoir" className="mx-auto my-4 w-full max-w-[420px]">
      <path d="M130 20c0 40 10 52 10 70 0 14-10 18-40 28-40 14-60 40-62 132h264c-2-92-22-118-62-132-30-10-40-14-40-28 0-18 10-30 10-70" fill="var(--surface-200)" stroke="var(--ink-muted)" strokeWidth="1.5" />
      {rows.map(([name, , y], i) => (
        <path key={name} d={`M${138 - i * 3} ${y - 22 - i * 3}Q180 ${y + 30 + i * 8} ${222 + i * 3} ${y - 22 - i * 3}`} fill="none" stroke={['var(--firuza)', 'var(--saffron)', 'var(--rosa)', 'var(--lapis)', 'var(--anar)'][i]} strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" />
      ))}
      {rows.map(([name, cm, y], i) => (
        <g key={name}>
          <line x1="262" y1={y + 12 + i * 6} x2="276" y2={34 + i * 38} stroke="var(--ink-muted)" strokeWidth="1" />
          <text x="280" y={38 + i * 38} fontSize="13" fontWeight="700" fill="var(--ink)">{name}</text>
          <text x="280" y={53 + i * 38} fontSize="12" fill="var(--ink-muted)" fontFamily="var(--font-dm-mono), monospace">{cm}</text>
        </g>
      ))}
    </svg>
  );
}

/** One size guide: intro, table, optional diagram and steps. Safe to render on the server and inside the dialog. */
export function SizeGuideView({ guide, headingLevel = 2 }: { guide: Guide; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const H2 = `h${headingLevel + 1}` as 'h3' | 'h4';
  return (
    <div>
      <H className="text-[clamp(24px,3.4vw,32px)]">{guide.title}</H>
      <p className="mt-2 max-w-[60ch] text-ink-muted">{guide.intro}</p>
      {guide.diagram === 'neckline' && <NecklineDiagram />}
      {guide.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-[15px]">
            <caption className="sr-only">{guide.title}</caption>
            <thead>
              <tr>{guide.table.head.map((h) => <th key={h} scope="col" className="label border-b-2 border-ink-muted px-3 py-2 text-[12px]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {guide.table.rows.map((r) => (
                <tr key={r.join('|')} className="border-b border-line">
                  {r.map((c, i) => (i === 0 ? <th key={i} scope="row" className="px-3 py-2.5 font-bold">{c}</th> : <td key={i} className="data px-3 py-2.5">{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {guide.steps && (
        <div className="mt-5">
          {guide.stepsTitle && <H2 className="text-xl tracking-normal">{guide.stepsTitle}</H2>}
          <ol className="mt-2 max-w-[60ch] list-decimal space-y-1.5 pl-6">{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}
    </div>
  );
}
