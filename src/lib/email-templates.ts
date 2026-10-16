// Pure HTML email templates (no imports, so they run under `npm test` and tools/render-emails.mjs).
// Palette "Granada y turquesa": ground #fff4ec, ink #2a1418, turquesa-ink #0f7d76 (buttons, white text), granada #a3262a, azafrán #f2a33a.
// Emails use inline styles and system fonts only (web fonts are not reliable in mail clients).

export type EmailOrder = {
  number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes?: string | null;
  total_cents: number;
  shipping_cents: number;
  shipping_zone?: string | null;
  shipping_to_confirm?: boolean;
  estimated_from?: string | null;
  estimated_to?: string | null;
  shipping_address: { line1: string; line2?: string | null; postal_code: string; city: string; province?: string | null; country: string };
  order_items: { quantity: number; name: string; options?: Record<string, string> | null; line_total_cents: number; delivery_mode?: string }[];
};
export type Email = { subject: string; html: string };

const INK = '#2a1418', MUTED = '#6b4f52', GROUND = '#fff4ec', TEAL = '#0f7d76', GRANADA = '#a3262a', SAFFRON = '#f2a33a', LINE = '#ecd5c4';
const FONT = 'Helvetica, Arial, sans-serif';
const DISPLAY = "'Arial Black', Helvetica, Arial, sans-serif";

export const eur = (c: number) => `${(c / 100).toFixed(2).replace('.', ',').replace(',00', '')} €`;
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function shell(preheader: string, body: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Firuza</title></head>
<body style="margin:0;padding:0;background:${GROUND};font-family:${FONT};color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 4px 16px;font-family:${DISPLAY};font-size:30px;font-weight:900;letter-spacing:-1px;color:${INK}">Firuza<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1a9e96;margin-left:6px"></span></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:28px 26px;border:1px solid ${LINE}">${body}</td></tr>
<tr><td style="padding:18px 4px 0;font-size:13px;line-height:1.5;color:${MUTED}">Firuza · Hecho a mano por Hafefa, Madrid.<br>¿Dudas? Escríbenos por WhatsApp o responde a este email.</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (t: string) => `<h1 style="margin:0 0 14px;font-family:${DISPLAY};font-size:26px;line-height:1.1;letter-spacing:-0.5px;color:${INK}">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${INK}">${t}</p>`;
const small = (t: string) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:${MUTED}">${t}</p>`;
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="background:${TEAL};border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
const badge = (t: string, bg: string, fg: string) => `<span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700">${t}</span>`;

function summary(o: EmailOrder): string {
  const rows = o.order_items.map((i) => {
    const opts = Object.entries(i.options ?? {}).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px">${i.quantity} × ${esc(i.name)}${opts ? `<br><span style="font-size:13px;color:${MUTED}">${esc(opts)}</span>` : ''}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:15px;white-space:nowrap">${eur(i.line_total_cents)}</td></tr>`;
  }).join('');
  const ship = (o.shipping_zone === 'consult' && o.shipping_to_confirm) ? 'A consultar' : o.shipping_cents > 0 ? eur(o.shipping_cents) : o.order_items.some((i) => i.delivery_mode === 'made_to_order') ? 'Gratis' : 'A confirmar';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px">${rows}
<tr><td style="padding:10px 0;font-size:15px;color:${MUTED}">Envío</td><td align="right" style="padding:10px 0;font-size:15px">${ship}</td></tr>
<tr><td style="padding:12px 0 0;font-size:18px;font-weight:700">Total</td><td align="right" style="padding:12px 0 0;font-size:18px;font-weight:700;color:${GRANADA}">${eur(o.total_cents)}${o.shipping_to_confirm ? `<br><span style="font-size:12px;font-weight:400;color:${MUTED}">+ envío a confirmar</span>` : ''}</td></tr></table>`;
}
const address = (o: EmailOrder) => { const a = o.shipping_address; return `${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}, ${esc(a.postal_code)} ${esc(a.city)}${a.province ? ' (' + esc(a.province) + ')' : ''}, ${esc(a.country)}`; };
const fmtDay = (d: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(d + 'T12:00:00'));
const when = (o: EmailOrder) => (o.estimated_from && o.estimated_to ? p(`Llegada estimada: del <strong>${fmtDay(o.estimated_from)}</strong> al <strong>${fmtDay(o.estimated_to)}</strong>.`) : '');

/** To the customer: order received (paid = false) or payment received (paid = true). */
export function orderConfirmationEmail(o: EmailOrder, { paid = false }: { paid?: boolean } = {}): Email {
  return {
    subject: paid ? `Pago recibido · pedido ${o.number}` : `Hemos recibido tu pedido ${o.number}`,
    html: shell(paid ? 'Hemos recibido tu pago.' : 'Hemos recibido tu pedido.',
      h1(`Hola ${esc(o.contact_name)},`) +
      p(paid ? '<strong>Hemos recibido tu pago.</strong> Hafefa ya está con tu pedido, hecho a mano.' : 'Gracias por tu pedido en Firuza. <strong>Aún no has pagado nada</strong>: te escribiremos por WhatsApp o email para confirmarlo y acordar el pago.') +
      `<p style="margin:0 0 6px">${badge(`Pedido ${esc(o.number)}`, paid ? TEAL : SAFFRON, paid ? '#ffffff' : INK)}</p>` +
      summary(o) + when(o) + small(`Envío a: ${address(o)}`)),
  };
}

/** To the owner: a new order, or an order that was just paid online. */
export function ownerOrderEmail(o: EmailOrder, { paid = false }: { paid?: boolean } = {}): Email {
  return {
    subject: `${paid ? 'Pedido PAGADO' : 'Nuevo pedido'} ${o.number} (${eur(o.total_cents)})`,
    html: shell(`${paid ? 'Pedido pagado' : 'Nuevo pedido'} ${o.number}`,
      h1(paid ? 'Pedido pagado online' : 'Nuevo pedido') +
      `<p style="margin:0 0 6px">${badge(`Pedido ${esc(o.number)}`, paid ? TEAL : GRANADA, '#ffffff')}</p>` +
      summary(o) +
      p(`<strong>Cliente:</strong> ${esc(o.contact_name)} · ${esc(o.contact_email)} · ${esc(o.contact_phone)}`) +
      p(`<strong>Envío a:</strong> ${address(o)}`) +
      (o.notes ? p(`<strong>Nota del cliente:</strong> ${esc(o.notes)}`) : '') + when(o)),
  };
}

/** To the customer: the owner confirmed the shipping and created the Stripe payment link (rugs, islands). */
export function paymentLinkEmail(o: EmailOrder, url: string): Email {
  return {
    subject: `Enlace de pago · pedido ${o.number}`,
    html: shell('Ya puedes pagar tu pedido.',
      h1(`Hola ${esc(o.contact_name)},`) +
      p(`Hemos confirmado el envío de tu pedido <strong>${esc(o.number)}</strong>. Ya puedes pagarlo con tarjeta de forma segura:`) +
      summary(o) + button(url, `Pagar ${eur(o.total_cents)}`) +
      small('Este enlace caduca en 24 horas. Si caduca, escríbenos y te mandamos otro.') + small(`Envío a: ${address(o)}`)),
  };
}

export function contactEmail(m: { name: string; email: string; phone?: string | null; message: string }): Email {
  return {
    subject: `Nuevo mensaje de ${m.name}`,
    html: shell('Nuevo mensaje desde la web',
      h1('Nuevo mensaje desde la web') + p(`${esc(m.name)} · ${esc(m.email)}${m.phone ? ' · ' + esc(m.phone) : ''}`) +
      `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;white-space:pre-wrap">${esc(m.message)}</p>`),
  };
}
