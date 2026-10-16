export const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  nuevo: 'Recibido',
  confirmado: 'Confirmado',
  pagado: 'Pagado',
  en_preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
export const STATUS_HELP: Record<string, string> = {
  pendiente_pago: 'Tu pedido está guardado y esperando el pago. Puedes pagar desde esta página.',
  nuevo: 'Hemos recibido tu pedido. Te escribiremos para confirmarlo.',
  confirmado: 'Pedido confirmado. Te enviamos un enlace de pago seguro.',
  pagado: 'Pago recibido. ¡Gracias!',
  en_preparacion: 'Estamos haciendo o preparando tu pieza.',
  enviado: 'Tu pedido va de camino.',
  entregado: 'Entregado. Esperamos que lo disfrutes.',
  cancelado: 'Pedido cancelado.',
};
export const STATUS_ORDER = ['nuevo', 'confirmado', 'pagado', 'en_preparacion', 'enviado', 'entregado'] as const;

const dt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const dtt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso: string) => dt.format(new Date(iso));
export const fmtDateTime = (iso: string) => dtt.format(new Date(iso));
