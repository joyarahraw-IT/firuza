const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
const eurWhole = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
/** 4500 -> "45 €", 5290 -> "52,90 €": cents only when needed. */
export const formatEur = (cents: number) => (cents % 100 === 0 ? eurWhole : eur).format(cents / 100).replace(/\u00a0/g, ' ');

export const WHATSAPP_NUMBER = '34600000000';
export const whatsappLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
